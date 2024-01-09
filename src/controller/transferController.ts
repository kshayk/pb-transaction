import {Request, Response} from "express";
import {
    acceptTransferRequest,
    createTransactionHistory,
    createTransferRequest,
    getTransferRequest,
    getUserAvailableBalance,
    incrementMoneyTransferRetryCount,
    rejectTransferRequest,
    sendTransferAcceptedNotificationMessage,
    sendTransferRequestNotificationMessage,
    updateAcceptanceReceiverBalance,
    updateAcceptanceSenderBalance,
    updateRejectionSenderBalance,
    updateUserAvailableBalance
} from "../service/transferService";
import mongoose from "mongoose";
import {TRANSFER_STATUS} from "../enum/transferStatusEnum";

async function generateErrorResponse(res: Response, message: string, error: any, statusCode: number, mongoSession: mongoose.ClientSession | null, withConsoleLog = false) {
    if (mongoSession) {
        await mongoSession.abortTransaction();
        await mongoSession.endSession();
    }

    if (withConsoleLog) {
        console.error(message, error);
    }

    return res.status(statusCode).send({message: message});
}

export async function requestTransfer(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    const requiredFields = ['receiverId', 'amount'];
    for (const field of requiredFields) {
        if (!req.body[field]) {
            return await generateErrorResponse(res, `Missing required field ${field}`, null, 400, session);
        }
    }

    const receiverId = req.body.receiverId;
    const amount = req.body.amount;
    const note = req.body.note ?? null;
    const senderId = req.body.userId;

    if (senderId === receiverId) {
        return await generateErrorResponse(res, 'Cannot transfer to self', null, 400, session);
    }

    const userAvailableBalance = await getUserAvailableBalance(senderId);
    if (userAvailableBalance < req.body.amount) {
        return await generateErrorResponse(res, 'Insufficient balance', null, 400, session);
    }

    try {
        await updateUserAvailableBalance(senderId, userAvailableBalance - amount);
    } catch (e) {
        return await generateErrorResponse(res, 'Error updating user balance', e, 500, session, true);
    }

    let transferRequestId: string
    try {
        transferRequestId = await createTransferRequest(senderId, receiverId, amount, note);
    } catch (e) {
        updateUserAvailableBalance(senderId, userAvailableBalance + amount).catch(e => {
            console.error(`Failed to add back the available funds for user ${senderId} after saving the transfer request has failed.`, e)
        });

        return await generateErrorResponse(res, 'Error creating transfer request', e, 500, session, true);
    }

    try {
        await sendTransferRequestNotificationMessage(transferRequestId, senderId, receiverId, amount, note);
    } catch (e) {
        incrementMoneyTransferRetryCount(transferRequestId).catch(e => {
            console.error(`Failed to increment the retry count for transfer ${transferRequestId} after sending the transfer notification has failed.`, e)
        });

        return await generateErrorResponse(res, 'Error sending transfer request notification', e, 500, session, true);
    }

    await session.commitTransaction();
    await session.endSession();
    return res.status(200).send({message: 'Transfer request sent'});
}

export async function rejectTransfer(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    if (!req.body.transferRequestId) {
        return await generateErrorResponse(res, 'Missing required field transferRequestId', null, 400, session);
    }

    const transferRequestId = req.body.transferRequestId;
    const receiverId = req.body.userId;

    const transferRequest = await getTransferRequest(transferRequestId);

    if (!transferRequest) {
        return await generateErrorResponse(res, 'Transfer request not found', null, 404, session);
    }

    if (transferRequest.transferStatus === TRANSFER_STATUS.PENDING) {
        return await generateErrorResponse(res, 'Transfer request already processed', null, 400, session);
    }

    if (transferRequest?.receiverId !== receiverId) {
        return await generateErrorResponse(res, 'Invalid token', null, 401, session);
    }

    try {
        await rejectTransferRequest(transferRequestId);
    } catch (e) {
        return await generateErrorResponse(res, 'Error rejecting transfer request', e, 500, session, true);
    }

    try {
        await updateRejectionSenderBalance(transferRequest);
    } catch (e) {
        return await generateErrorResponse(res, 'Error updating sender balance', e, 500, session, true);
    }

    await session.commitTransaction();
    await session.endSession();
    return res.status(200).send({message: 'Transfer request rejected'});
}

export async function acceptTransfer(req: Request, res: Response) {
    const session = await mongoose.startSession();
    session.startTransaction();

    if (!req.body.transferRequestId) {
        return await generateErrorResponse(res, 'Missing required field transferRequestId', null, 400, session);
    }

    const transferRequestId = req.body.transferRequestId;
    const receiverId = req.body.userId;

    const transferRequest = await getTransferRequest(transferRequestId);

    if (!transferRequest) {
        return await generateErrorResponse(res, 'Transfer request not found', null, 404, session);
    }

    if (transferRequest.transferStatus !== TRANSFER_STATUS.PENDING) {
        return await generateErrorResponse(res, 'Transfer request already processed', null, 400, session);
    }

    try {
        await acceptTransferRequest(transferRequestId);
    } catch (e) {
        return await generateErrorResponse(res, 'Error accepting transfer request', e, 500, session, true);
    }

    if (transferRequest?.receiverId !== receiverId) {
        return await generateErrorResponse(res, 'Invalid token', null, 401, session);
    }

    try {
        await updateAcceptanceSenderBalance(transferRequest);
    } catch (e) {
        return await generateErrorResponse(res, 'Error updating sender balance', e, 500, session, true);
    }

    try {
        await updateAcceptanceReceiverBalance(transferRequest);
    } catch (e) {
        return await generateErrorResponse(res, 'Error updating receiver balance', e, 500, session, true);
    }

    try {
        await createTransactionHistory(transferRequest);
    } catch (e) {
        return await generateErrorResponse(res, 'Error creating transaction history', e, 500, session, true);
    }

    try {
        await sendTransferAcceptedNotificationMessage(transferRequest);
    } catch (e) {
        return await generateErrorResponse(res, 'Error sending transfer accepted notification', e, 500, session, true);
    }

    await session.commitTransaction();
    await session.endSession();
    return res.status(200).send({message: 'Transfer request accepted'});
}
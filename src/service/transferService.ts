import { User } from "../model/User";
import {TransferMoney, TransferMoneyDocument} from "../model/TransferMoney";
import { TRANSFER_STATUS } from "../enum/transferStatusEnum";
import {queueConnect} from "../queue/rabbitmq";
import {TransactionHistory, transactionType} from "../model/TransactionHistory";
import {TRANSACTION_HISTORY_TYPE} from "../enum/transactionHistoryTypeEnum";

export async function getTransferRequest(transferId: string): Promise<TransferMoneyDocument | null> {
    return TransferMoney.findById(transferId);
}

export async function getUserAvailableBalance(userId: string): Promise<number> {
    const user = await User.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }

    return user.availableBalance as number;
}

export async function updateUserAvailableBalance(userId: string, newBalance: number): Promise<void> {
    await User.updateOne({ _id: userId }, { availableBalance: newBalance });
}

export async function updateUserBalance(userId: string, newBalance: number): Promise<void> {
    await User.updateOne({ _id: userId }, { balance: newBalance });
}

export async function createTransferRequest(senderId: string, receiverId: string, amount: number, note: string | null): Promise<string> {
    const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const moneyTransfer = new TransferMoney(
        {
            senderId: senderId,
            receiverId: receiverId,
            transferStatus: TRANSFER_STATUS.PENDING,
            transferAmount: amount,
            notes: "",
            retries: 0,
            expireAt: sevenDaysFromNow
        }
    );

    const transferDocument = await moneyTransfer.save();
    return transferDocument._id;
}

export async function sendTransferRequestNotificationMessage(transferRequestId : string, senderId: string, receiverId: string, amount: number, note: string | null): Promise<void> {
    const queueName = 'moneySentQueue';
    const channel = await queueConnect(queueName);

    const message = {
        transferId: transferRequestId,
        senderId,
        receiverId,
        amount,
        note
    };

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));
}

export async function sendTransferAcceptedNotificationMessage(transferDocument: TransferMoneyDocument): Promise<void> {
    const queueName = 'moneyReceivedQueue';
    const channel = await queueConnect(queueName);

    const message = {
        transferId: transferDocument._id,
        receiverId: transferDocument.receiverId,
        senderId: transferDocument.senderId
    }

    channel.sendToQueue(queueName, Buffer.from(JSON.stringify(message)));
}

export async function incrementMoneyTransferRetryCount(transferId: string): Promise<void> {
    await TransferMoney.updateOne({ _id: transferId }, { $inc: { retries: 1 } });
}

export async function acceptTransferRequest(transferId: string): Promise<void> {
    await TransferMoney.updateOne({ _id: transferId }, { transferStatus: TRANSFER_STATUS.COMPLETED });
}

export async function rejectTransferRequest(transferId: string): Promise<void> {
    await TransferMoney.updateOne({ _id: transferId }, { transferStatus: TRANSFER_STATUS.REJECTED });
}

export async function updateRejectionSenderBalance(transferDocument: TransferMoneyDocument): Promise<void> {
    const sender = await User.findById(transferDocument.senderId);
    if (!sender) {
        throw new Error(`Sender ${transferDocument.senderId} not found`);
    }

    const newAvailableBalance = sender.availableBalance as number + transferDocument.transferAmount;

    await updateUserAvailableBalance(transferDocument.senderId, newAvailableBalance);
}

export async function updateAcceptanceSenderBalance(transferDocument: TransferMoneyDocument): Promise<void> {
    const sender = await User.findById(transferDocument.senderId);
    if (!sender) {
        throw new Error(`Sender ${transferDocument.senderId} not found`);
    }

    const newBalance = sender.balance as number - transferDocument.transferAmount;

    await updateUserBalance(transferDocument.senderId, newBalance);
}

export async function updateAcceptanceReceiverBalance(transferDocument: TransferMoneyDocument): Promise<void> {
    const receiver = await User.findById(transferDocument.receiverId);
    if (!receiver) {
        throw new Error(`Receiver ${transferDocument.receiverId} not found`);
    }

    const newBalance = receiver.balance as number + transferDocument.transferAmount;
    const newAvailableBalance = receiver.availableBalance as number + transferDocument.transferAmount;

    await updateUserBalance(transferDocument.receiverId, newBalance);
    await updateUserAvailableBalance(transferDocument.receiverId, newAvailableBalance);
}

export async function createTransactionHistory(transferDocument: TransferMoneyDocument): Promise<void> {
    const senderTransactionHistory = new TransactionHistory({
        userId: transferDocument.senderId,
        transactionId: transferDocument._id,
        transactionType: TRANSACTION_HISTORY_TYPE.PAY,
        transactionAmount: -transferDocument.transferAmount
    });

    await senderTransactionHistory.save();

    const receiverTransactionHistory = new TransactionHistory({
        userId: transferDocument.receiverId,
        transactionId: transferDocument._id,
        transactionType: TRANSACTION_HISTORY_TYPE.RECEIVE,
        transactionAmount: transferDocument.transferAmount
    });

    await receiverTransactionHistory.save();
}
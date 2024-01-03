import mongoose from "mongoose";
import { TRANSFER_STATUS } from "../enum/transferStatusEnum";

type transferStatusType = TRANSFER_STATUS.PENDING | TRANSFER_STATUS.ACKNOWLEDGED | TRANSFER_STATUS.REJECTED | TRANSFER_STATUS.COMPLETED;

export type TransferMoneyDocument = mongoose.Document & {
    senderId: string;
    receiverId: string;
    transferStatus: transferStatusType;
    transferAmount: number;
    notes: string;
    retries: number;
    expireAt: Date;
};

const TransferMoneySchema = new mongoose.Schema<TransferMoneyDocument>(
    {
        senderId: String,
        receiverId: String,
        transferStatus: Number,
        transferAmount: Number,
        notes: String,
        retries: Number,
        expireAt: {
            type: Date
        },
    },
    { timestamps: true },
);

export const TransferMoney = mongoose.model<TransferMoneyDocument>("TransferMoney", TransferMoneySchema);
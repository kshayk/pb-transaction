import mongoose from "mongoose";
import {TRANSACTION_HISTORY_TYPE} from "../enum/transactionHistoryTypeEnum";

export type transactionType = TRANSACTION_HISTORY_TYPE.PAY | TRANSACTION_HISTORY_TYPE.RECEIVE;
export type TransactionHistoryDocument = mongoose.Document & {
    userId: string;
    transactionId: string;
    transactionType: transactionType;
    transactionAmount: number;
};

const transactionHistorySchema = new mongoose.Schema<TransactionHistoryDocument>(
    {
        userId: String,
        transactionId: String,
        transactionType: String,
        transactionAmount: Number
    },
    { timestamps: true },
);

export const TransactionHistory = mongoose.model<TransactionHistoryDocument>("TransactionHistory", transactionHistorySchema);
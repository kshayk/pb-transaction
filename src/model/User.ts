import mongoose from "mongoose";

export interface IUser extends mongoose.Document {
    balance: number,
    availableBalance: number,
}

const UserModel = new mongoose.Schema<IUser>(
    {
        balance: Number,
        availableBalance: Number,
    },
    { timestamps: true },
);

export const User = mongoose.model<IUser>("User", UserModel);
import mongoose from "mongoose";

const UserModel = new mongoose.Schema(
    {
        balance: Number,
        availableBalance: Number,
    },
    { timestamps: true },
);

export const User = mongoose.model("User", UserModel);
import mongoose from "mongoose";
import * as process from "process";

export async function connect() {
    await mongoose.connect(`mongodb://${process.env.MONGO_HOST}:27017/paybox`, {
        "user": process.env.MONGO_USER,
        "pass": process.env.MONGP_PASSWORD
    });
}
import * as jwt from "jsonwebtoken";
import {IUser, User} from "../model/User";

export async function addUser() {
    const userModel = new User({
        balance: 450,
        availableBalance: 450,
    });

    const user = await userModel.save();

    return generateJWT(user);
}

export function generateJWT(userData: IUser) {
    const userObject = {
        userId: userData._id
    }

    return jwt.sign(userObject, process.env.JWT_SECRET as string, {
        expiresIn: '7d'
    });
}
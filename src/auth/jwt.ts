import * as jwt from "jsonwebtoken";
import {JwtUserDataType} from "../type/JwtUserDataType";

export async function validateJwt(token: string | undefined): Promise<JwtUserDataType> {
    if (!token) {
        throw new Error('No token provided');
    }

    let userData: JwtUserDataType;
    return new Promise((resolve, reject) => {
        jwt.verify(token.split(' ')[1], process.env.JWT_SECRET as string, (err: any, decoded) => {
            if (err) {
                reject('Token not verified');
            }

            userData = decoded as JwtUserDataType;
            resolve(userData);
        });
    });
}

export async function createJWTToken(user: JwtUserDataType) {
    return jwt.sign(user, process.env.JWT_SECRET as string, {
        expiresIn: '1h',
    });
}
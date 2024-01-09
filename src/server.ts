import express, {response} from "express";
import { Response, Request, NextFunction } from "express";
import * as dotenv from 'dotenv';
import {requestTransfer, rejectTransfer, acceptTransfer} from "./controller/transferController";
import * as bodyParser from 'body-parser';
import {connect} from "./database/mongo";
import {JwtUserDataType} from "./type/JwtUserDataType";
import {validateJwt} from "./auth/jwt";
import {addUser} from "./testrun/testRun";

const jsonParser = bodyParser.json();

dotenv.config();

const app = express();

app.use(jsonParser);

const validateToken = async (req: Request, res: Response, next: NextFunction) => {
    let userData : JwtUserDataType;
    try {
        userData = await validateJwt(req.headers.authorization);
    } catch (e) {
        return res.status(401).send({message: 'Invalid token'});
    }

    req.body.userId = userData.userId

    next();
};

app.use(async (req: Request, res: Response, next: NextFunction) => {
    await connect();
    next();
});

app.post("/transfer", validateToken, async (req: Request, res: Response) => {
    return await requestTransfer(req, res);
});

app.post("/reject-transfer", validateToken, async (req: Request, res: Response) => {
    return await rejectTransfer(req, res);
});

app.post("/accept-transfer", validateToken, async (req: Request, res: Response) => {
    return await acceptTransfer(req, res);
});

app.post("/group-transfer", validateToken, async (req: Request, res: Response) => {
    // TODO: Implement this
});

/*********** Test Routes - TODO - DELETE THIS ON PROD ***********/
app.post("/create-user", async (req: Request, res: Response) => {
    const userJWTToken = await addUser();

    res.send({
        success: true,
        token: userJWTToken
    });
});


app.listen(8080, () => {
    console.log("Server listening on port 8080");
});
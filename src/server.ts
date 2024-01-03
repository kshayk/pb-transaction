import express, {response} from "express";
import { Response, Request, NextFunction } from "express";
import * as dotenv from 'dotenv';
import {requestTransfer, rejectTransfer, acceptTransfer} from "./controller/transferController";
import * as bodyParser from 'body-parser';
import {connect} from "./database/mongo";

const jsonParser = bodyParser.json();

dotenv.config();

const app = express();

app.use(async (req: Request, res: Response, next: NextFunction) => {
    await connect();
    next();
});

app.post("/transfer", jsonParser, async (req: Request, res: Response) => {
    return await requestTransfer(req, res);
});

app.post("/reject-transfer", jsonParser, async (req: Request, res: Response) => {
    return await rejectTransfer(req, res);
});

app.post("/accept-transfer", jsonParser, async (req: Request, res: Response) => {
    return await acceptTransfer(req, res);
});

app.post("/group-transfer", jsonParser, async (req: Request, res: Response) => {
    // TODO: Implement this
});


app.listen(8080, () => {
    console.log("Server listening on port 8080");
});
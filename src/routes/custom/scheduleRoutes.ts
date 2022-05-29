import { Router, Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import Schedule from "./../../models/schedule";
import schedule, { ISchedule } from "./../../models/schedule";
import { authorize, getToken, ICritential } from "./../../tools/authentication";
import { compareTime, convertToCron, convertToCronDay } from "./../../tools/convertTime";

//define type of schedule for request body
interface IGetParams {
    _id: mongoose.Types.ObjectId;
    model_camera_id: mongoose.Types.ObjectId;
    start: string;
    stop: string;
    dayOfWeek: number[];
    threshold: number;
    zones: [[number, number, number, number]];
    montionDetection: boolean;
}

//create router for add to server file 
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//add route for register new schedule
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { start, stop, dayOfWeek, model_camera_id, montionDetection, threshold }: IGetParams = req.body;
        //verify body request
        if (!start || !stop || !dayOfWeek || !model_camera_id || !montionDetection || !threshold) {
            req.flash("error", "Please fill all fields");
            return next({ status: 400, message: "Bad request" });
        }
        //get token from header request
        let token: string = getToken(req, next) as string;
        //verify token
        let critential: ICritential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" });
        }
        //check for valid time
        if (!compareTime(start, stop)) {
            req.flash("error", "Invalid time");
            return next({ status: 400, message: "Invalid time" });
        }

        //convert input time to cron format
        let start_cron: string = convertToCron(start);
        let stop_cron: string = convertToCron(stop);
        //query for save new schedule in DB
        let schedule = await Schedule.findOne({
            $or: [
                { start_cron: start_cron },
                { stop_cron: stop_cron },
                { model_camera_id: model_camera_id }
            ]
        }).exec();

        //return error if schedule already exist
        if (schedule) {
            req.flash("error", "schedule already exist");
            return next({ status: 200, message: "schedule already exist" });
        }

        //fil new schedule
        schedule = new Schedule({
            start_cron: start_cron,
            stop_cron: stop_cron,
            model_camera_id: model_camera_id,
            montionDetection: montionDetection,
            config: {
                threshold: threshold ?? 0,
                zones: null
            }
        });

        //save schedule in DB
        await schedule.save();

        //return success
        req.flash("info", "schedule added");
        return res.status(201).json({
            message: 'Success',
            schedule: schedule
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the AI: ${err}` });
    }
});


export default router;
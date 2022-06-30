import { Router, Request, Response, NextFunction } from "express";
import mongoose, { Model } from "mongoose";
import HttpException from "./../../../error/HttpException";
import Schedule, { ISchedule } from "./../../../models/schedule";
import { getTokenAndVerify } from "./../../../tools/authentication";
import { compareTime, convertToCron, convertToCronDay } from "./../../../tools/convertTime";
import ModelToCamera from "./../../../models/modelToCamera";

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
    min_people: number;
    max_people: number;
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
router.post("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const {
            start, stop, dayOfWeek, camera_id, model_id,
            montionDetection, threshold, zones, min_people, max_people
        } = req.body;
        //verify body request
        if (!start || !stop || !dayOfWeek || !camera_id || !model_id || !montionDetection || !threshold) {
            req.flash("error", "Please fill all fields");
            return next(new HttpException(400, "Please fill all fields", "schedule"));
        }
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
        //check for valid time
        if (!compareTime(start, stop)) {
            req.flash("error", "Invalid time");
            return next(new HttpException(400, "Invalid time", "schedule"));
        }
        //search for model in DB
        let model2Camera = await ModelToCamera.findOne({
            $or: [
                { model_id: model_id },
                { camera_id: camera_id }
            ]
        }).exec();

        //convert input time to cron format
        let start_cron: string = convertToCron(start);
        start_cron = convertToCronDay(start_cron, dayOfWeek.toString());
        let stop_cron: string = convertToCron(stop);
        stop_cron = convertToCronDay(stop_cron, dayOfWeek.toString());

        //query for save new schedule in DB
        if (model2Camera) {
            let schedule = await Schedule.findOneAndDelete({
                $or: [
                    { start_cron: start_cron },
                    { stop_cron: stop_cron },
                    { model_camera_id: model2Camera._id }
                ]
            }).exec();
            if (schedule) {
                model2Camera = await ModelToCamera.findOneAndDelete({
                    $or: [
                        { model_id: model_id },
                        { camera_id: camera_id }
                    ]
                }).exec();
            }
        }

        //save model to camera
        let model2CameraSave = new ModelToCamera({
            model_id: model_id,
            camera_id: camera_id
        });
        let model2camera = await model2CameraSave.save();

        //fil new schedule
        let schedule = new Schedule({
            start_cron: start_cron,
            stop_cron: stop_cron,
            model_camera_id: model2camera._id,
            montionDetection: montionDetection,
            config: {
                threshold: threshold ?? 0,
                zones: zones ?? null,
                min_people: min_people ?? 0,
                max_people: max_people ?? 0
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
    } catch (err: any) {
        return next(new HttpException(500, err.message, "schedule"));
    }
});


//route for get schedule list  
router.get("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.PerPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get schedule from DB
        let schedules: ISchedule[] | null = await Schedule.find({}).limit(perPage).skip(perPage * (page - 1)).exec();

        //return success
        req.flash("info", "schedule list");
        //send response to client with schedules
        return res.status(200).json({
            message: 'Success',
            schedules: schedules,
            page: page,
            perPage: perPage,
            total: await Schedule.countDocuments().exec(),
            pages: Math.ceil(await Schedule.countDocuments().exec() / perPage)
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "schedule"));
    }
});

//route for get schedule by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Schedule id is required");
            return next(new HttpException(400, "Schedule id is required", "schedule"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
        //query for get schedule by id from DB
        let schedule = await Schedule.findById(id).exec();

        //return response not found to client if not found schedule
        if (!schedule) {
            req.flash("error", "schedule not found");
            return next(new HttpException(404, "schedule not found", "schedule"));
        }

        //return response to client with schedule
        return res.status(200).json({
            message: "Success",
            schedule: schedule
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "schedule"));
    }
});


//add route for edit schedule
router.patch("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "schedule id is required");
            return next(new HttpException(400, "schedule id is required", "schedule"));
        }
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
        //get body from request
        const scheduleBody: IGetParams = req.body;

        if (!scheduleBody.start && !scheduleBody.stop && scheduleBody.dayOfWeek) {
            req.flash("error", "start and stop is required");
            return next(new HttpException(400, "start and stop is required", "schedule"));
        }

        if (scheduleBody.start && !scheduleBody.stop && !scheduleBody.dayOfWeek) {
            req.flash("error", "start and stop is required");
            return next(new HttpException(400, "start and stop is required", "schedule"));
        }

        if (!scheduleBody.start && scheduleBody.stop && !scheduleBody.dayOfWeek) {
            req.flash("error", "start and stop is required");
            return next(new HttpException(400, "start and stop is required", "schedule"));
        }

        if (scheduleBody.start && scheduleBody.stop) {
            //check for valid time
            if (!compareTime(scheduleBody.start, scheduleBody.stop)) {
                req.flash("error", "Invalid time");
                return next(new HttpException(400, "Invalid time", "schedule"));
            }

            //convert input time to cron format
            let start_cron: string = convertToCron(scheduleBody.start);
            start_cron = convertToCronDay(start_cron, scheduleBody.dayOfWeek.toString());
            let stop_cron: string = convertToCron(scheduleBody.stop);
            stop_cron = convertToCronDay(stop_cron, scheduleBody.dayOfWeek.toString());

        }
        //query for get schedule by id from DB and update
        let schedule = await Schedule.findByIdAndUpdate(id, scheduleBody, { new: true }).exec();

        //return response not found to client if not found schedule
        if (!schedule) {
            req.flash("error", "schedule not found");
            return next(new HttpException(404, "schedule not found", "schedule"));
        }

        //return response to client with schedule
        return res.status(201).json({
            message: "Success",
            schedule: schedule
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "schedule"));
    }
});

//add route for delete schedule
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "schedule id is required");
            return next(new HttpException(400, "schedule id is required", "schedule"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get schedule by id from DB
        let schedule = await Schedule.findByIdAndDelete(id).exec();
        //return response not found to client if not found schedule
        if (!schedule) {
            req.flash("error", "schedule not found");
            return next(new HttpException(404, "schedule not found", "schedule"));
        }
        //return response to client with schedule
        return res.status(201).json({
            message: "Success",
            schedule: schedule
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "schedule"));
    }
});

export default router;
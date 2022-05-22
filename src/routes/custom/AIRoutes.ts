import { Router, Request, Response, NextFunction } from "express";
import AI, { IAI } from "./../../models/AI";
import { authorize, getToken, ICritential } from "./../../tools/authentication";

//create router for add to server file 
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//add route for register new AI
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { start, end, thresholdid, minTime, zone, type, minPeople, maxPeople } = req.body;
        //verify body request
        if (!start || !end || !zone || !type) {
            return next({ status: 400, message: "Bad request" });
        }
        if (type === 'FireDetection' && !thresholdid) {
            return next({ status: 400, message: "Bad request" });
        } else if (type === 'FaceRecognition' && !minTime && !thresholdid) {
            return next({ status: 400, message: "Bad request" });
        } else if (type === 'PeopleCounting' && !minPeople && !maxPeople) {
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token: string = getToken(req, next) as string;

        //verify token
        let critential: ICritential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" });
        }

        let newAi = new AI();
        //query for save new AI in DB
        AI.findOne({ start: start, end: end, type: type }, async function (err: Error, Ai: IAI | null) {
            if (err) { return next(err); }
            if (Ai) {
                req.flash("error", "AI already exists");
                return res.status(201).json({ message: "AI already exists" });
            }
            //fill new AI
            newAi = new AI({
                start: start,
                end: end,
                thresholdid: thresholdid ?? 0,
                minTime: minTime ?? null,
                zone: zone ?? null,
                type: type,
                minPeople: minPeople ?? 0,
                maxPeople: maxPeople ?? 0
            });

            //save new AI in DB
            await newAi.save(next);
            //send response to client with new AI 
            return res.status(201).json({
                message: 'AI model created',
                AI: newAi
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the AI: ${err}` });
    }
});

//route for get AIs list  
router.get("/ais", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get AI from DB
        AI.find({}, function (err: Error, AIs: IAI[] | null) {
            if (err) { return next(err); }
            if (!AIs) { return next(new Error("Not Found")); }
            //send response to client with AI    
            return res.status(200).json({
                message: 'Success',
                AIs: AIs
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the AIs: ${err}` });
    }
});

//route for get AI by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        let id: string = req.params.id;
        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get AI by id from DB
        AI.findById(req.params.id, function (err: Error, Ai: IAI | null) {
            if (err) { return next(err); }
            if (!Ai) { return next(new Error("Not Found")); }
            //send response to client with AI    
            return res.status(200).json({
                message: 'Success',
                AI: Ai
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the AI: ${err}` });
    }
});


//add route for edit AI
router.put("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;

        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        const AIBody = req.body;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get camera by id from DB
        AI.findById(id,async function (err: Error, Ai: IAI | null) {
            if (err) { return next(err); }
            if (!Ai) { return next(new Error("Not Found")); }
            //fill AI
            Ai.start = AIBody.start ?? Ai.start;
            Ai.end = AIBody.end ?? Ai.end;
            Ai.thresholdid = AIBody.thresholdid ?? Ai.thresholdid;
            Ai.minTime = AIBody.minTime ?? Ai.minTime;
            Ai.zone = AIBody.zone ?? Ai.zone;
            Ai.type = AIBody.type ?? Ai.type;
            Ai.minPeople = AIBody.minPeople ?? Ai.minPeople;
            Ai.maxPeople = AIBody.maxPeople ?? Ai.maxPeople;

            //save AI in DB
            await Ai.save(next);
            //send response to client with AI
            return res.status(201).json({
                message: 'AI model updated',
                AI: Ai
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the AI: ${err}` });
    }
});


//add route for delete AI
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        let id: string = req.params.id;
        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }
        //query for get AI by id from DB
        AI.findByIdAndDelete(id, function (err: Error, ai: IAI | null) {
            if (err) { return next(err); }
            if (!ai) { return next({ status: 401, message: "Not Found" }) };
            //send response to client with AI
            return res.status(201).json({
                message: 'Success',
                AI: {}
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the AI: ${err}` });
    }

});

export default router;
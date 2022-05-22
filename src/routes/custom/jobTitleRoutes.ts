import { Router, Request, Response, NextFunction } from "express";
import JobTitle, { IJobTitle } from "./../../models/jobTitle";
import { authorize, getToken } from "./../../tools/authentication";


//define token type after verify
interface ICritential {
    id: string;
    email: string;
    role: string;
    exp: number;
    iat: number;
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


//add route for register new jobTitle
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name } = req.body;
        //verify body request
        if (!name) {
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

        let newjobTitle = new JobTitle();
        //query for save new jobTitle in DB
        JobTitle.findOne({ name: name }, async function (err: Error, jobTitle: IJobTitle | null) {
            if (err) { return next(err); }
            if (jobTitle) {
                req.flash("error", "jobTitle already exists");
                return res.status(201).json({ message: "jobTitle already exists" });
            }
            //fill new jobTitle
            newjobTitle = new JobTitle({
                name: name
            });

            //save new jobTitle in DB
            await newjobTitle.save(next);
            //send response to client with new jobTitle 
            return res.status(201).json({
                message: 'jobTitle created',
                jobTitle: newjobTitle
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the jobTitle: ${err}` });
    }
});

//route for get jobTitle list  
router.get("/jobtitles", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as any;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get jobTitle from DB
        JobTitle.find({}, function (err: Error, jobTitles: IJobTitle[] | null) {
            if (err) { return next(err); }
            if (!jobTitles) { return next(new Error("Not Found")); }
            //send response to client with jobTitle    
            return res.status(200).json({
                message: 'Success',
                jobTitles: jobTitles
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the jobTitle: ${err}` });
    }
});

//route for get jobTitle by id from DB 
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
        let critential = authorize(token) as any;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get jobTitle by id from DB
        JobTitle.findById(req.params.id, function (err: Error, jobTitle: IJobTitle | null) {
            if (err) { return next(err); }
            if (!jobTitle) { return next(new Error("Not Found")); }
            //send response to client with jobTitle    
            return res.status(200).json({
                message: 'Success',
                jobTitle: jobTitle
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the jobTitle: ${err}` });
    }
});


//add route for edit jobTitle
router.put("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;

        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        const jobTitleBody = req.body;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as any;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }
        //query for get jobTitle by id from DB
        JobTitle.findById(id, async function (err: Error, jobTitle: IJobTitle | null) {
            if (err) { return next(err); }
            if (!jobTitle) { return next({ status: 401, message: "Not Found" }) };
            //update jobTitle model
            let updateJobTitle = new JobTitle({
                id: id,
                name: jobTitleBody.name ?? jobTitle.name,
            });
            //save edit jobTitle in DB
            await updateJobTitle.set(next);
            //return response with message and jobTitle
            return res.status(201).json({
                message: 'jobTitle Edited',
                jobTitle: updateJobTitle
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the jobTitle: ${err}` });
    }
});


//add route for delete jobTitle
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
    try {
        let id: string = req.params.id;
        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as any;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get jobTitle by id from DB
        JobTitle.findById(id, async function (err: Error, jobTitle: any) {
            if (err) { return next(err); }
            if (!jobTitle) { return next(new Error("Not Found")); }
            //delete jobTitle in DB
            await jobTitle.delete(next);
            //send response to client with jobTitle
            return res.status(201).json({
                message: 'jobTitle Deleted',
                jobTitle: {}
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the jobTitle: ${err}` });
    }

});

export default router;
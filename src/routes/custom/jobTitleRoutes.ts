import { Router, Request, Response, NextFunction } from "express";
import JobTitle, { IJobTitle } from "./../../models/jobTitle";
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


//add route for register new jobTitle
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name } = req.body;
        //verify body request
        if (!name) {
            req.flash("error", "Please enter a name");
            return next({ status: 400, message: "Bad request" });
        }
        //get token from header request
        let token: string = getToken(req, next) as string;
        //verify token
        let critential: ICritential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token has been expired");
            return next({ status: 401, message: "Token expired" });
        }

        //query for save new jobTitle in DB
        let jobTitle = await JobTitle.findOne({ name: name }).exec();

        //check if jobTitle is exist
        if (jobTitle) {
            req.flash("error", "JobTitle is exist");
            return next({ status: 200, message: "jobTitle already exists" });
        }

        //set value for new jobTitle
        let newjobTitle = new JobTitle();
        newjobTitle.name = name;

        //save new jobTitle in DB
        await newjobTitle.save();

        //send response
        return res.status(201).json({
            message: "jobTitle has been created",
            jobTitle: newjobTitle
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the jobTitle: ${err}` });
    }
});

//route for get jobTitle with search from DB 
router.get("/find", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get param from url
        let search = req.query.search as string;
        let strLimit = req.query.limit as string;
        let limit = parseInt(strLimit) > 0 ? parseInt(strLimit) : 1;
        if (!search) {
            req.flash("error", "JobTitle id is required");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }

        //query for search JobTitle by id from DB
        let jobTitle = await JobTitle.find({
            name: { $regex: search, $options: "i" }
        }).limit(limit).exec();

        //return response not found to client if not found JobTitle
        if (!jobTitle) {
            req.flash("error", "JobTitle not found");
            return next(new Error("Not Found"));
        }
        //return response to client with jobTitle
        return res.status(200).json({
            message: "Success",
            jobTitle: jobTitle,
            limit: limit,
            total: await JobTitle.countDocuments().exec(),
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the JobTitle: ${err}` });
    }
});

//route for get jobTitle list  
router.get("/list", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.PerPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token has been expired");
            return next({ status: 401, message: "Token expired" })
        }

        //query for get jobTitle from DB
        let jobTitles = await JobTitle.find().limit(perPage).skip(perPage * (page - 1)).exec();

        //return response not found to client if not found jobTitles
        if (!jobTitles) {
            req.flash("error", "Not found jobTitles");
            return next({ status: 404, message: "Not found jobTitles" });
        }

        //send response
        return res.status(200).json({
            message: "Success",
            jobTitles: jobTitles,
            page: page,
            perPage: perPage,
            total: await JobTitle.countDocuments().exec(),
            pages: Math.ceil(await JobTitle.countDocuments().exec() / perPage)
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the jobTitle: ${err}` });
    }
});

//route for get jobTitle by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "JobTitle id is required");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token has been expired");
            return next({ status: 401, message: "Token expired" })
        }

        //query for get jobTitle by id from DB
        let jobTitle = await JobTitle.findById(id).exec();

        //return response not found to client if not found jobTitle
        if (!jobTitle) {
            req.flash("error", "JobTitle not found");
            return next(new Error("Not Found"));
        }

        //send response
        return res.status(200).json({
            message: "Success",
            jobTitle: jobTitle
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
        if (!id) {
            req.flash("error", "JobTitle id is required");
            return next({ status: 400, message: "Bad request" });
        }
        //get body from request
        const jobTitleBody = req.body;
        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }
        //query for get jobTitle by id from DB
        let jobTitle = await JobTitle.findByIdAndUpdate(id, jobTitleBody, { new: true }).exec();

        //return response not found to client if not found jobTitle
        if (!jobTitle) {
            req.flash("error", "JobTitle not found");
            return next(new Error("Not Found"));
        }
        
        //send response
        return res.status(201).json({
            message: "Success",
            jobTitle: jobTitle
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the jobTitle: ${err}` });
    }
});


//add route for delete jobTitle
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as any;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token has been expired");
            return next({ status: 401, message: "Token expired" })
        }

        //query for get jobTitle by id from DB
        let jobTitle = await JobTitle.findByIdAndDelete(id).exec();

        //return response not found to client if not found jobTitle
        if (!jobTitle) {
            req.flash("error", "JobTitle not found");
            return next(new Error("Not Found"));
        }

        //send response
        return res.status(201).json({
            message: "Success",
            jobTitle: jobTitle
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the jobTitle: ${err}` });
    }

});

export default router;
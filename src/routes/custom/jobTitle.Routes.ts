import { Router, Request, Response, NextFunction } from "express";
import HttpException from "../../error/HttpException";
import JobTitle, { IJobTitle } from "../../models/jobTitle";
import { getTokenAndVerify } from "../../tools/authentication";

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
router.post("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name } = req.body;
        //verify body request
        if (!name) {
            req.flash("error", "Please enter a name");
            return next(new HttpException(400, "Please enter a name", "jobTitle"));
        }
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for save new jobTitle in DB
        let jobTitle = await JobTitle.findOne({ name: name }).exec();

        //check if jobTitle is exist
        if (jobTitle) {
            req.flash("error", "JobTitle is exist");
            return next(new HttpException(400, "JobTitle is exist", "jobTitle"));
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
    } catch (err: any) {
        return next(new HttpException(500, err.message, "jobTitle"));
    }
});

//route for get jobTitle list  
router.get("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.PerPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
        let search = req.query.search as string ?? "";
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get jobTitle from DB
        let jobTitles: IJobTitle[] = [];
        if ((search && search.length > 0)) {
            jobTitles = await JobTitle.find({
                name: { $regex: search, $options: "i" }
            }).limit(perPage).skip(perPage * (page - 1)).exec();
        } else {
            jobTitles = await JobTitle.find().limit(perPage).skip(perPage * (page - 1)).exec();
        }

        //return response not found to client if not found jobTitles
        if (!jobTitles) {
            req.flash("error", "Not found jobTitles");
            return next(new HttpException(404, "Not found jobTitles", "jobTitle"));
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
    } catch (err: any) {
        return next(new HttpException(500, err.message, "jobTitle"));
    }
});

//route for get jobTitle by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "JobTitle id is required");
            return next(new HttpException(400, "JobTitle id is required", "jobTitle"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get jobTitle by id from DB
        let jobTitle = await JobTitle.findById(id).exec();

        //return response not found to client if not found jobTitle
        if (!jobTitle) {
            req.flash("error", "JobTitle not found");
            return next(new HttpException(404, "JobTitle not found", "jobTitle"));
        }

        //send response
        return res.status(200).json({
            message: "Success",
            jobTitle: jobTitle
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "jobTitle"));
    }
});


//add route for edit jobTitle
router.patch("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "JobTitle id is required");
            return next(new HttpException(400, "JobTitle id is required", "jobTitle"));
        }
        //get body from request
        const jobTitleBody = req.body;
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
        //query for get jobTitle by id from DB
        let jobTitle = await JobTitle.findByIdAndUpdate(id, jobTitleBody, { new: true }).exec();

        //return response not found to client if not found jobTitle
        if (!jobTitle) {
            req.flash("error", "JobTitle not found");
            return next(new HttpException(404, "JobTitle not found", "jobTitle"));
        }

        //send response
        return res.status(201).json({
            message: "Success",
            jobTitle: jobTitle
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "jobTitle"));
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

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get jobTitle by id from DB
        let jobTitle = await JobTitle.findByIdAndDelete(id).exec();

        //return response not found to client if not found jobTitle
        if (!jobTitle) {
            req.flash("error", "JobTitle not found");
            return next(new HttpException(404, "JobTitle not found", "jobTitle"));
        }

        //send response
        return res.status(201).json({
            message: "Success",
            jobTitle: jobTitle
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "jobTitle"));
    }

});

export default router;
import { Router, Request, Response, NextFunction } from "express";
import Personnel, { IPersonnel } from "../../models/personnel";
import { authorize, getToken, ICritential } from "../../tools/authentication";


//create router for add to routes file 
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//add route for register new personnel
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { first_name, last_name, national_code, email, phone_number, job_id, personnel_code,
            section_id, camera_whitelist, is_active, is_employee, is_dismissed } = req.body;
        //verify body request
        if (!first_name || !last_name || !national_code || !email || !phone_number || !job_id || !personnel_code ||
            !section_id || !camera_whitelist || !is_active || !is_employee || !is_dismissed) {
            req.flash("error", "Please fill all fields");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token: string = getToken(req, next) as string;
        //verify token
        let critential: ICritential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token has expired");
            return next({ status: 401, message: "Token expired" });
        }
        //query for save new personnel in DB
        let personnel = await Personnel.findOne({
            $or: [
                { national_code: personnel_code },
                { personnel_code: personnel_code }
            ]
        }).exec();

        //check personnel in DB
        if (personnel) {
            req.flash("error", "Personnel already exists");
            return next({ status: 200, message: "Personnel already exists" });
        }

        //create new personnel
        personnel = new Personnel({
            first_name,
            last_name,
            national_code,
            email,
            phone_number,
            job_id,
            personnel_code,
            section_id,
            camera_whitelist,
            is_active,
            is_employee,
            is_dismissed
        });

        //save personnel in DB
        personnel = await personnel.save();
        req.flash("info", "Personnel has been registered");
        //send response
        res.status(201).json({
            message: "Success",
            personnel: personnel
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the personnel: ${err}` });
    }
});

//route for get personnel with search from DB 
router.get("/find", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get param from url
        let search = req.query.search as string;
        let strLimit = req.query.limit as string;
        let limit = parseInt(strLimit) > 0 ? parseInt(strLimit) : 1;
        if (!search) {
            req.flash("error", "Please enter search");
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

        //query for search personnel by id from DB
        let personnel = await Personnel.find({
            name: { $regex: search, $options: "i" }
        }).limit(limit).exec();

        //return response not found to client if not found personnel
        if (!personnel) {
            req.flash("error", "Personnel not found");
            return next(new Error("Not Found"));
        }
        //return response to client with perssonel
        return res.status(200).json({
            message: "Success",
            personnel: personnel,
            limit: limit,
            total: await Personnel.countDocuments().exec()
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the personnel: ${err}` });
    }
});


//route for get personnels list  
router.get("/list", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        } else if (critential.role !== "admin") {
            req.flash("error", "You are not admin");
            return next({ status: 401, message: "Unauthorized" });
        }
        //query for get user by personnels from DB
        let personnels = await Personnel.find().limit(perPage).skip(perPage * (page - 1)).exec();

        //send not found if personnels not found
        if (!personnels) {
            req.flash("error", "Personnels not found");
            return next({ status: 200, message: "Not Found" });
        }
        //send response
        return res.status(200).json({
            message: 'Success',
            personnels: personnels,
            page: page,
            perPage: perPage,
            total: await Personnel.countDocuments().exec(),
            pages: Math.ceil(await Personnel.countDocuments().exec() / perPage)
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the personnel: ${err}` });
    }

});

//route for get personnel by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        let id: string = req.params.id;
        //verify body request
        if (!id) {
            req.flash("error", "Please enter id");
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

        //query for get personnel by id from DB
        let personnel = await Personnel.findById(id).exec();

        //send not found if personnel not found
        if (!personnel) {
            req.flash("error", "Personnel not found");
            return next({ status: 200, message: "Not Found" });
        }

        //send response
        return res.status(200).json({
            message: 'Success',
            personnel: personnel
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the personnel: ${err}` });
    }
});


//add route for edit personnel
router.put("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Please enter id");
            return next({ status: 400, message: "Bad request" });
        }

        const personnelBody = req.body;
        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }
        //query for get personnel by id from DB
        let personnel = await Personnel.findByIdAndUpdate(id, personnelBody, { new: true }).exec();

        //send not found if personnel not found
        if (!personnel) {
            req.flash("error", "Personnel not found");
            return next({ status: 200, message: "Not Found" });
        }

        //send response
        return res.status(201).json({
            message: 'Success',
            personnel: personnel
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the personnel: ${err}` });
    }
});


//add route for delete personnel
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id = req.params.id;
        if (!id) {
            req.flash("error", "Please enter id");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token: string = getToken(req, next) as string;
        //verify token
        let critential: ICritential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }

        //query for get personnel by id from DB
        let personnel = await Personnel.findByIdAndDelete(id).exec();

        //send not found if personnel not found
        if (!personnel) {
            req.flash("error", "Personnel not found");
            return next({ status: 200, message: "Not Found" });
        }

        //send response
        return res.status(201).json({
            message: 'Success',
            personnel: personnel
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the personnel: ${err}` });
    }

});

export default router;
import { Router, Request, Response, NextFunction } from "express";
import Departement, { IDepartement } from "../../models/departement";
import { authorize, getToken, ICritential } from "../../tools/authentication";

//create router for add to server file 
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//add route for register new departement
router.post("/", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name, created_date } = req.body;
        //verify body request
        if (!name) {
            req.flash("error", "Departement name is required");
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

        let newDepartement = new Departement();
        //query for save new departement in DB
        let departement = await Departement.findOne({ name: name }).exec();
        //retrun error if departement already exists
        if (departement) {
            req.flash("error", "Departement already exists");
            return next({ status: 400, message: "Departement already exists" });
        }
        //fill new departement
        newDepartement = new Departement({
            name: name,
            created_date: created_date
        });
        //query for save new departement in DB
        await newDepartement.save();
        req.flash("info", "Departement added");
        return res.status(201).json({
            message: "departement created",
            departement: newDepartement
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the departement: ${err}` });
    }
});


//route for get departements list  
router.get("/list", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
        let search = req.query.search as string;

        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }
        //query for get departements list
        let departements: IDepartement[] = [];
        if (!(search && search.length > 0)) {
            departements = await Departement.find({
                name: { $regex: search, $options: "i" }
            }).limit(perPage).skip(perPage * (page - 1)).exec();
        } else {
            departements = await Departement.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
        }

        //return response not found to client if not found departements
        if (!departements) {
            req.flash("error", "Departement not found");
            return next({ status: 404, message: "Departement not found" });
        }

        //return response to client with departements list
        return res.status(200).json({
            message: "Success",
            departements: departements,
            page: page,
            perPage: perPage,
            total: await Departement.countDocuments().exec(),
            pages: Math.ceil(await Departement.countDocuments().exec() / perPage)
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the departements: ${err}` });
    }
});

//route for get departement by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        let id: string = req.params.id;
        //verify body request
        if (!id) {
            req.flash("error", "Departement id is required");
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

        //query for get departement by id from DB
        let departement = await Departement.findById(id).exec();

        //return response not found to client if not found departement
        if (!departement) {
            req.flash("error", "Departement not found");
            return next({ status: 404, message: "Departement not found" });
        }
        //return response to client with departement
        return res.status(200).json({
            message: "Success",
            departement: departement
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the departement: ${err}` });
    }
});


//add route for edit departement
router.patch("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;

        //verify body request
        if (!id) {
            req.flash("error", "Departement id is required");
            return next({ status: 400, message: "Bad request" });
        }

        const departementBody = req.body;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }
        //query for get camera by id from DB and update
        let departement = await Departement.findByIdAndUpdate(id, departementBody, { new: true }).exec();
        //return response not found to client if not found departement
        if (!departement) {
            req.flash("error", "Departement not found");
            return next({ status: 404, message: "Departement not found" });
        }
        //return response to client with departement
        return res.status(201).json({
            message: "Success",
            departement: departement
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the departement: ${err}` });
    }
});


//add route for delete departement
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
    try {
        let id: string = req.params.id;
        //verify body request
        if (!id) {
            req.flash("error", "Departement id is required");
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

        //query for get departement by id from DB
        let departement = await Departement.findByIdAndDelete(id).exec();
        //return response not found to client if not found departement
        if (!departement) {
            req.flash("error", "Departement not found");
            return next({ status: 404, message: "Departement not found" });
        }
        //return response to client with departement
        return res.status(201).json({
            message: "Success",
            departement: departement
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the departement: ${err}` });
    }
});

export default router;
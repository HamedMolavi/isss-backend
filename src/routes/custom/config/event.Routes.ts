import { Router, Request, Response, NextFunction } from "express";
import HttpException from "./../../../error/HttpException";
import Departement, { IDepartement } from "./../../../models/departement";
import { getTokenAndVerify } from "./../../../tools/authentication";

//create router for add to server file 
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//add route for register new event 
router.post("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name, created_date } = req.body;
        //verify body request
        if (!name) {
            req.flash("error", "Departement name is required");
            return next(new HttpException(400, "Departement name is required", "departement"));
        }
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        let newDepartement = new Departement();
        //query for save new departement in DB
        let departement = await Departement.findOne({ name: name }).exec();
        //retrun error if departement already exists
        if (departement) {
            req.flash("error", "Departement already exists");
            return next(new HttpException(400, "Departement already exists", "departement"));
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
    } catch (err: any) {
        return next(new HttpException(500, err.message, "departement"));
    }
});


//route for get departements list  
router.get("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
        let search = req.query.search as string || "";

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
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
            return next(new HttpException(404, "Departement not found", "departement"));
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
    } catch (err: any) {
        return next(new HttpException(500, err.message, "departement"));
    }
});

//route for get departement by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        let id: string = req.params.id;
        //verify body request
        if (!id) {
            req.flash("error", "Departement id is required");
            return next(new HttpException(400, "Departement id is required", "departement"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get departement by id from DB
        let departement = await Departement.findById(id).exec();

        //return response not found to client if not found departement
        if (!departement) {
            req.flash("error", "Departement not found");
            return next(new HttpException(404, "Departement not found", "departement"));
        }
        //return response to client with departement
        return res.status(200).json({
            message: "Success",
            departement: departement
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "departement"));
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
            return next(new HttpException(400, "Departement id is required", "departement"));
        }

        const departementBody = req.body;
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
        //query for get camera by id from DB and update
        let departement = await Departement.findByIdAndUpdate(id, departementBody, { new: true }).exec();
        //return response not found to client if not found departement
        if (!departement) {
            req.flash("error", "Departement not found");
            return next(new HttpException(404, "Departement not found", "departement"));
        }
        //return response to client with departement
        return res.status(201).json({
            message: "Success",
            departement: departement
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "departement"));
    }
});


//add route for delete departement
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
    try {
        let id: string = req.params.id;
        //verify body request
        if (!id) {
            req.flash("error", "Departement id is required");
            return next(new HttpException(400, "Departement id is required", "departement"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get departement by id from DB
        let departement = await Departement.findByIdAndDelete(id).exec();
        //return response not found to client if not found departement
        if (!departement) {
            req.flash("error", "Departement not found");
            return next(new HttpException(404, "Departement not found", "departement"));
        }
        //return response to client with departement
        return res.status(201).json({
            message: "Success",
            departement: departement
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "departement"));
    }
});

export default router;
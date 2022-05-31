import { Router, Request, Response, NextFunction } from "express";
import Color, { IColor } from "./../../models/color";
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


//add route for register new color
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name } = req.body;
        //verify body request
        if (!name) {
            req.flash("error", "Color name is required");
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

        //query for save new color in DB
        let color = await Color.findOne({ name: name }).exec();
        //retrun error if color already exists
        if (color) {
            req.flash("error", "Color already exists");
            return res.status(201).json({ message: "Color already exists" });
        }
        //fill new color
        let newColor = new Color({
            name: name
        });
        //query for save new color in DB
        await newColor.save();
        req.flash("info", "Color added");
        return res.status(201).json({
            message: "color created",
            color: newColor
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the color: ${err}` });
    }
});

//route for get color with search from DB 
router.get("/find", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get param from url
        let search = req.query.search as string;
        let strLimit = req.query.limit as string;
        let limit = parseInt(strLimit) > 0 ? parseInt(strLimit) : 1;
        if (!search) {
            req.flash("error", "Search is required");
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

        //query for search color by id from DB
        let color = await Color.find({
            name: { $regex: search, $options: "i" }
        }).limit(limit).exec();

        //return response not found to client if not found color
        if (!color) {
            req.flash("error", "Color not found");
            return next(new Error("Not Found"));
        }
        //return response to client with color
        return res.status(200).json({
            message: "Success",
            color: color,
            limit: limit,
            total: await Color.countDocuments().exec(),
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the color: ${err}` });
    }
});



//route for get color list  
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
        }
        //query for get color list
        let colors = await Color.find({}).limit(perPage).skip(perPage * (page - 1)).exec();

        //return response not found to client if not found colors
        if (!colors) {
            req.flash("error", "Color not found");
            return next(new Error("Not Found"));
        }

        //return response to client with color list
        return res.status(200).json({
            message: "Success",
            colors: colors,
            page: page,
            perPage: perPage,
            total: await Color.countDocuments().exec(),
            pages: Math.ceil(await Color.countDocuments().exec() / perPage)
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the color: ${err}` });
    }
});

//route for get color by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Color id is required");
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

        //query for get color by id from DB
        let color = await Color.findById(id).exec();

        //return response not found to client if not found color
        if (!color) {
            req.flash("error", "Color not found");
            return next(new Error("Not Found"));
        }
        //return response to client with color
        return res.status(200).json({
            message: "Success",
            color: color
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the color: ${err}` });
    }
});


//add route for delete color by id from DB
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Color id is required");
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

        //query for get color by id from DB
        let color = await Color.findByIdAndDelete(id).exec();
        //return response not found to client if not found color
        if (!color) {
            req.flash("error", "Color not found");
            return next(new Error("Not Found"));
        }
        //return response to client with color
        return res.status(201).json({
            message: "Success",
            color: color
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the color: ${err}` });
    }

});

export default router;
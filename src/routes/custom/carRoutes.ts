import { Router, Request, Response, NextFunction } from "express";
import CarBrand, { ICarBrand } from "../../models/carBrand";
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


//add route for register new car_brand
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name } = req.body;
        //verify body request
        if (!name) {
            req.flash("error", "Car brand is required");
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

        //query for save new car_brand in DB
        let carBrand = await CarBrand.findOne({ name: name }).exec();
        //retrun error if car_brand already exists
        if (carBrand) {
            req.flash("error", "Car Brand already exists");
            return res.status(201).json({ message: "car already exists" });
        }
        //fill new car_brand
        let newCarBrand = new CarBrand({
            name: name
        });
        //query for save new car_brand in DB
        await newCarBrand.save();
        req.flash("info", "Car Brand added");
        return res.status(201).json({
            message: "car created",
            carBrand: newCarBrand
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the car brand: ${err}` });
    }
});

//route for get car_brand with search from DB 
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

        //query for search car_brand by id from DB
        let carBrand = await CarBrand.find({
            name: { $regex: search, $options: "i" }
        }).limit(limit).exec();

        //return response not found to client if not found car_band
        if (!carBrand) {
            req.flash("error", "Car Brand not found");
            return next(new Error("Not Found"));
        }
        //return response to client with car_brand
        return res.status(200).json({
            message: "Success",
            carBrand: carBrand,
            limit: limit,
            total: await CarBrand.countDocuments().exec(),
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the car brand: ${err}` });
    }
});



//route for get car list  
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
        //query for get car_barnd list
        let carBrands = await CarBrand.find({}).limit(perPage).skip(perPage * (page - 1)).exec();

        //return response not found to client if not found car_brand
        if (!carBrands) {
            req.flash("error", "Car Brands not found");
            return next(new Error("Not Found"));
        }

        //return response to client with car_brand list
        return res.status(200).json({
            message: "Success",
            carBrands: carBrands,
            page: page,
            perPage: perPage,
            total: await CarBrand.countDocuments().exec(),
            pages: Math.ceil(await CarBrand.countDocuments().exec() / perPage)
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the car brands: ${err}` });
    }
});

//route for get car_brand by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Car Brand id is required");
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

        //query for get car_brand by id from DB
        let carBrand = await CarBrand.findById(id).exec();

        //return response not found to client if not found car_brand
        if (!carBrand) {
            req.flash("error", "Car Brand not found");
            return next(new Error("Not Found"));
        }
        //return response to client with car
        return res.status(200).json({
            message: "Success",
            carBrand: carBrand
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the car brand: ${err}` });
    }
});


//add route for delete car_brand by id from DB
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Car Brand id is required");
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

        //query for get car_brand by id from DB
        let carBrand = await CarBrand.findByIdAndDelete(id).exec();
        //return response not found to client if not found car_brand
        if (!carBrand) {
            req.flash("error", "Car Brand not found");
            return next(new Error("Not Found"));
        }
        //return response to client with car_brand
        return res.status(201).json({
            message: "Success",
            carBrand: carBrand
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the car brand: ${err}` });
    }

});

export default router;
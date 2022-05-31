import { Router, Request, Response, NextFunction } from "express";
import Car, { ICar } from "./../../models/car";
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


//add route for register new car
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name } = req.body;
        //verify body request
        if (!name) {
            req.flash("error", "Car name is required");
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

        //query for save new car in DB
        let car = await Car.findOne({ name: name }).exec();
        //retrun error if car already exists
        if (car) {
            req.flash("error", "Car already exists");
            return res.status(201).json({ message: "car already exists" });
        }
        //fill new car
        let newCar = new Car({
            name: name
        });
        //query for save new car in DB
        await newCar.save();
        req.flash("info", "Car added");
        return res.status(201).json({
            message: "car created",
            car: newCar
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the car: ${err}` });
    }
});

//route for get car with search from DB 
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

        //query for search car by id from DB
        let car = await Car.find({
            name: { $regex: search, $options: "i" }
        }).limit(limit).exec();

        //return response not found to client if not found car
        if (!car) {
            req.flash("error", "Car not found");
            return next(new Error("Not Found"));
        }
        //return response to client with car
        return res.status(200).json({
            message: "Success",
            car: car,
            limit: limit,
            total: await Car.countDocuments().exec(),
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the car: ${err}` });
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
        //query for get car list
        let cars = await Car.find({}).limit(perPage).skip(perPage * (page - 1)).exec();

        //return response not found to client if not found car
        if (!cars) {
            req.flash("error", "Car not found");
            return next(new Error("Not Found"));
        }

        //return response to client with car list
        return res.status(200).json({
            message: "Success",
            cars: cars,
            page: page,
            perPage: perPage,
            total: await Car.countDocuments().exec(),
            pages: Math.ceil(await Car.countDocuments().exec() / perPage)
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the car: ${err}` });
    }
});

//route for get car by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Car id is required");
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

        //query for get car by id from DB
        let car = await Car.findById(id).exec();

        //return response not found to client if not found car
        if (!car) {
            req.flash("error", "Car not found");
            return next(new Error("Not Found"));
        }
        //return response to client with car
        return res.status(200).json({
            message: "Success",
            car: car
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the car: ${err}` });
    }
});


//add route for delete car by id from DB
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Car id is required");
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

        //query for get car by id from DB
        let car = await Car.findByIdAndDelete(id).exec();
        //return response not found to client if not found car
        if (!car) {
            req.flash("error", "Car not found");
            return next(new Error("Not Found"));
        }
        //return response to client with car
        return res.status(201).json({
            message: "Success",
            car: car
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the car: ${err}` });
    }

});

export default router;
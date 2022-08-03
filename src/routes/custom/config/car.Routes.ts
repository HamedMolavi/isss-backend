import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../../error/error.handler";
import Car, { ICar } from "./../../../models/car";
import { getTokenAndVerify } from "./../../../tools/authentication";


//get user role from enviroment variable
const const_role = process.env.const_role || "user";


//create router for add to routes file 
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//add route for register new car
router.post("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { owner, number_plate, brand_id, color_id, camera_whitelist } = req.body;
        if (!owner || !number_plate || !brand_id || !color_id || !camera_whitelist) {
            req.flash("error", "Car is required");
            return next(new ApiError(400, "Car is required"));
        }
        //get token from header request and verify
        let token = getTokenAndVerify(req, const_role, next);
      if(!token){
        return null;
      }

        //query for save new car in DB
        let car = await Car.findOne({
            $or: [
                { number_plate: number_plate },
                { owner: owner }
            ]
        }).exec();

        //retrun error if car already exists
        if (car) {
            req.flash("error", "Car already exists");
            return next(new ApiError(400, "Car already exists"));
        }

        //fill new car
        let newCar = new Car({
            owner: owner,
            number_plate: number_plate,
            brand_id: brand_id,
            color_id: color_id,
            camera_whitelist: camera_whitelist
        });

        //query for save new car in DB
        await newCar.save();
        req.flash("info", "Car added");
        //send response to client
        return res.status(201).json({
            success: true,
            data: newCar
        });
    } catch (err: any) {
        return next(new ApiError(500,"internal server error" + err.message));
    }
});

//route for get car list  
router.get("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        let search = req.query.search as string || "";
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

        //get token from header request and verify
        let token = getTokenAndVerify(req, const_role, next);
      if(!token){
        return null;
      }

        //query for get car list from DB
        let cars: ICar[] = [];
        if (!(search && search.length > 0)) {
            cars = await Car.find({
                number_plate: { $regex: search, $options: "i" }
            }).limit(perPage).skip(perPage * (page - 1)).exec();
        } else {
            cars = await Car.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
        }

        //return response not found to client if not found cars
        if (!cars) {
            req.flash("error", "car not found");
            return next(new ApiError(404, "car not found"));
        }

        //return response to client with cars list
        return res.status(200).json({
            success: true,
            data: cars,
            page: page,
            perPage: perPage,
            total: await Car.countDocuments().exec(),
            pages: Math.ceil(await Car.countDocuments().exec() / perPage)
        });
    } catch (err: any) {
        return next(new ApiError(500, "internal server error" + err.message));
    }
});

//route for get car by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Car id is required");
            return next(new ApiError(400, "Car id is required"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, const_role, next);
      if(!token){
        return null;
      }

        //query for get car by id from DB
        let car = await Car.findById(id).exec();

        //return response not found to client if not found car
        if (!car) {
            req.flash("error", "Car not found");
            return next(new ApiError(404, "Car not found"));
        }
        //return response to client with departement
        return res.status(200).json({
            success: true,
            data: car
        });
    } catch (err: any) {
        return next(new ApiError(500, "internal server error" + err.message));
    }
});


//add route for edit car
router.patch("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;

        //verify body request
        if (!id) {
            req.flash("error", "Car id is required");
            return next(new ApiError(400, "Car id is required"));
        }
        //get body request
        const carBody = req.body;
        //get token from header request and verify
        let token = getTokenAndVerify(req, const_role, next);
      if(!token){
        return null;
      }
        //query for get car by id from DB and update
        let car = await Car.findByIdAndUpdate(id, carBody, { new: true }).exec();
        //return response not found to client if not found car
        if (!car) {
            req.flash("error", "Car not found");
            return next(new ApiError(404, "Car not found"));
        }
        //return response to client with car
        return res.status(201).json({
            success: true,
            data: car
        });
    } catch (err: any) {
        return next(new ApiError(500, "internal server error" + err.message));
    }
});


//add route for delete car
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
    try {
        let id: string = req.params.id;
        //verify body request
        if (!id) {
            req.flash("error", "Car id is required");
            return next(new ApiError(400, "Car id is required"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, const_role, next);
      if(!token){
        return null;
      }

        //query for get car by id from DB
        let car = await Car.findByIdAndDelete(id).exec();
        //return response not found to client if not found car
        if (!car) {
            req.flash("error", "Car not found");
            return next(new ApiError(404, "Car not found"));
        }
        //return response to client with car
        return res.status(201).json({
            success: true,
            data: car
        });
    } catch (err: any) {
        return next(new ApiError(500, "internal server error" + err.message));
    }
});

export default router;
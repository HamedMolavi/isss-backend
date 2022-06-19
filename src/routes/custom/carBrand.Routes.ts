import { Router, Request, Response, NextFunction } from "express";
import HttpException from "../../error/HttpException";
import CarBrand, { ICarBrand } from "../../models/carBrand";
import { authorize, getToken, getTokenAndVerify, ICritential } from "../../tools/authentication";

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
router.post("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name } = req.body;
        //verify body request
        if (!name) {
            req.flash("error", "Car brand is required");
            return next(new HttpException(400, "Bad request", "Car_Brand"));
        }
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for save new car_brand in DB
        let carBrand = await CarBrand.findOne({ name: name }).exec();
        //retrun error if car_brand already exists
        if (carBrand) {
            req.flash("error", "Car Brand already exists");
            return next(new HttpException(400, "Car Brand already exists", "Car_Brand"));
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
    } catch (err: any) {
        return next(new HttpException(500, err.message, "Car_Brand"));
    }
});

//route for get car list  
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
        //query for get car_barnd list
        let carBrands: ICarBrand[] = [];
        if (!(search && search.length > 0)) {
            carBrands = await CarBrand.find({
                name: { $regex: search, $options: "i" }
            }).limit(perPage).skip(perPage * (page - 1)).exec();
        } else {
            carBrands = await CarBrand.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
        }

        //return response not found to client if not found car_brand
        if (!carBrands) {
            req.flash("error", "Car Brands not found");
            return next(new HttpException(404, "Car Brands not found", "Car_Brand"));
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
    } catch (err: any) {
        return next(new HttpException(500, err.message, "Car_Brand"));
    }
});

//route for get car_brand by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Car Brand id is required");
            return next(new HttpException(400, "Bad request", "Car_Brand"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get car_brand by id from DB
        let carBrand = await CarBrand.findById(id).exec();

        //return response not found to client if not found car_brand
        if (!carBrand) {
            req.flash("error", "Car Brand not found");
            return next(new HttpException(404, "Car Brand not found", "Car_Brand"));
        }
        //return response to client with car
        return res.status(200).json({
            message: "Success",
            carBrand: carBrand
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "Car_Brand"));
    }
});


//add route for delete car_brand by id from DB
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Car Brand id is required");
            return next(new HttpException(400, "Bad request", "Car_Brand"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get car_brand by id from DB
        let carBrand = await CarBrand.findByIdAndDelete(id).exec();
        //return response not found to client if not found car_brand
        if (!carBrand) {
            req.flash("error", "Car Brand not found");
            return next(new HttpException(404, "Car Brand not found", "Car_Brand"));
        }
        //return response to client with car_brand
        return res.status(201).json({
            message: "Success",
            carBrand: carBrand
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "Car_Brand"));
    }

});

export default router;
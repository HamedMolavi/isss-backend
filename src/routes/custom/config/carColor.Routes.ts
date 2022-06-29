import { Router, Request, Response, NextFunction } from "express";
import HttpException from "./../../../error/HttpException";
import CarColor, { ICarColor } from "./../../../models/carColor";
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


//add route for register new car_color
router.post("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name } = req.body;
        //verify body request
        if (!name) {
            req.flash("error", "Car Color name is required");
            return next(new HttpException(400, "Bad request", "Car_Color"));
        }
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for save new car_color in DB
        let carColor = await CarColor.findOne({ name: name }).exec();
        //retrun error if car_color already exists
        if (carColor) {
            req.flash("error", "Car Color already exists");
            return next(new HttpException(400, "Car Color already exists", "Car_Color"));
        }
        //fill new car_color
        let newCarColor = new CarColor({
            name: name
        });
        //query for save new car_color in DB
        await newCarColor.save();
        req.flash("info", "Car Color added");
        return res.status(201).json({
            message: "Car Color created",
            carColor: newCarColor
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "Car_Color"));
    }
});


//route for get car_color list  
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
        //query for get car_color list
        let carColors: ICarColor[] = [];
        if (!(search && search.length > 0)) {
            carColors = await CarColor.find({
                name: { $regex: search, $options: "i" }
            }).limit(perPage).skip(perPage * (page - 1)).exec();
        } else {
            carColors = await CarColor.find().limit(perPage).skip(perPage * (page - 1)).exec();
        }

        //return response not found to client if not found car_colors
        if (!carColors) {
            req.flash("error", "Car Color not found");
            return next(new HttpException(404, "Car Color not found", "Car_Color"));
        }

        //return response to client with car_color list
        return res.status(200).json({
            message: "Success",
            carColors: carColors,
            page: page,
            perPage: perPage,
            total: await CarColor.countDocuments().exec(),
            pages: Math.ceil(await CarColor.countDocuments().exec() / perPage)
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "Car_Color"));
    }
});

//route for get car_color by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Car Color id is required");
            return next(new HttpException(400, "Bad request", "Car_Color"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get car_color by id from DB
        let carColor = await CarColor.findById(id).exec();

        //return response not found to client if not found car_color
        if (!carColor) {
            req.flash("error", "Car Color not found");
            return next(new HttpException(404, "Car Color not found", "Car_Color"));
        }
        //return response to client with car_color
        return res.status(200).json({
            message: "Success",
            carColor: carColor
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "Car_Color"));
    }
});


//add route for delete car_color by id from DB
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Car Color id is required");
            return next(new HttpException(400, "Bad request", "Car_Color"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get car_color by id from DB
        let carColor = await CarColor.findByIdAndDelete(id).exec();
        //return response not found to client if not found car_color
        if (!carColor) {
            req.flash("error", "Car Color not found");
            return next(new HttpException(404, "Car Color not found", "Car_Color"));
        }
        //return response to client with car_color
        return res.status(201).json({
            message: "Success",
            carColor: carColor
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "Car_Color"));
    }

});

export default router;
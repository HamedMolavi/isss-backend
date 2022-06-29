import { Router, Request, Response, NextFunction } from "express";
import HttpException from "./../../../error/HttpException";
import Model, { IModel } from "./../../../models/model";
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

//route for get jobTitle by id from DB 
router.get("/:category", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get category from url
        let category: string = req.params.category;
        if (!category) {
            req.flash("error", "category is required");
            return next(new HttpException(400, "category is required", "model"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get model by id from DB
        let model = await Model.findOne({ category: category }).exec();

        //check model is exist
        if (!model) {
            req.flash("error", "model is not exist");
            return next(new HttpException(400, "model is not exist", "model"));
        }

        //send model to client
        return res.status(200).json({
            message: 'Success',
            model: model
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "model"));
    }
});


export default router;
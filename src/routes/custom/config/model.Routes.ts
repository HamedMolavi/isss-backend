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

//create route for get list of models
router.get("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.PerPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
        //query for get list of models
        let models = await Model.find().limit(perPage).skip(perPage * (page - 1)).exec()
        //query for get total count of models
        let total = await Model.countDocuments().exec();
        //return list of models
        return res.status(200).json({
            message: "Success",
            models: models,
            page: page,
            perPage: perPage,
            total: await Model.countDocuments().exec(),
            pages: Math.ceil(await Model.countDocuments().exec() / perPage)
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "model"));
    }
});


//route for get model by category from DB 
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
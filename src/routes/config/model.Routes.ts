import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../../types/classes/error.class";
import Model, { IModel } from "../../db/mongo/models/model";


//create router for add to server file
const router: Router = Router();

//create route for get list of models
router.get("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
        //query for get list of models
        let models = await Model.find().limit(perPage).skip(perPage * (page - 1)).exec()
        if (!models) {
            req.flash("error", "No models found");
            return next(new ApiError(404, "No models found"));
        }

        //return list of models
        return res.status(200).json({
            success: true,
            data: models,
            page: page,
            perPage: perPage,
            total: await Model.countDocuments().exec(),
            pages: Math.ceil(await Model.countDocuments().exec() / perPage)
        });
    } catch (err: any) {
        return next(new ApiError(500, "internal server error" + err.message));
    }
});


//route for get model by category from DB 
router.get("/:category", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get category from url
        let category: string = req.params.category;
        if (!category) {
            req.flash("error", "category is required");
            return next(new ApiError(400, "category is required"));
        }

        //query for get model by id from DB
        let model = await Model.findOne({ category: category }).exec();

        //check model is exist
        if (!model) {
            req.flash("error", "model is not exist");
            return next(new ApiError(404, "model is not exist"));
        }

        //send model to client
        return res.status(200).json({
            success: true,
            data: model
        });
    } catch (err: any) {
        return next(new ApiError(500, "internal server error" + err.message));
    }
});


export default router;
import { Router, Request, Response, NextFunction } from "express";
import Model, { IModel } from "../../models/model";
import { authorize, getToken, ICritential } from "../../tools/authentication";


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
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "token is expired");
            return next({ status: 401, message: "Token expired" })
        }

        //query for get model by id from DB
        let model = await Model.findOne({ category: category }).exec();

        //check model is exist
        if (!model) {
            req.flash("error", "model is not exist");
            return next({ status: 404, message: "Model is not exist" });
        }

        //send model to client
        return res.status(200).json({
            message: 'Success',
            model: model
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the jobTitle: ${err}` });
    }
});


export default router;
import uploadFile from '../tools/fileUpload';
import { NextFunction, Router, Request, Response } from 'express';

//create router for add to server 
const router: Router = Router();


//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//create api for upload file 
router.post('/upload', async function (req: Request, res: Response, next: NextFunction) {
    try {
        await uploadFile(req, res);
        if (req.file == undefined) {
            return next({ status: 400, message: "Please upload a file!" });
        }
        res.status(200).send({
            message: "Uploaded the file successfully: " + req.file.originalname,
        });
    } catch (err) {
        return next({ status: 500, message: `Could not upload the file: ${req.file!.originalname}. ${err}` });
    }
});


export default router;
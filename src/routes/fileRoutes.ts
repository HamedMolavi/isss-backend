import uploadFile, { fileName, location } from '../tools/fileUpload';
import { NextFunction, Router, Request, Response } from 'express';
import fs from 'fs';

//create router for add to server 
const router: Router = Router();


//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//create api for upload image 
router.post('/upload', async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get file from request body and save 
        await uploadFile(req, res);
        if (req.file == undefined) {
            return next({ status: 400, message: "Please upload a file!" });
        }
        res.status(200).send({
            name: fileName,
            location: location,
            message: "Uploaded the file successfully: " + fileName,
        });
    } catch (err) {
        return next({ status: 500, message: `Could not upload the file: ${req.file!.originalname}. ${err}` });
    }
});


//create api for download image
router.get('/download/:fileName', async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get file name from request params
        const fileName = req.params.fileName;
        //get directory path
        const directoryPath = __dirname + "/../../assets/uploads/";
        //send image to client
        res.download(directoryPath + fileName, fileName, (err) => {
            if (err) {
                return next({ status: 500, message: `Could not download the file: ${fileName}. ${err}` });
            }
        });
    } catch (err) {
        return next({ status: 500, message: `Could not download the file: ${fileName}. ${err}` });
    }
});


//create api for get list file upload
router.get('/files/list', async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get directory path
        const directoryPath = __dirname + "/../../assets/uploads/";
        //get url 
        const baseUrl = process.env["BaseUrl"] as string;

        //read directory for get list file
        fs.readdir(directoryPath, function (err, files) {
            if (err) {
                return next({ status: 500, message: `Could not get list file. ${err}` });
            }
            let fileInfos: object[] = [];
            //get file info
            files.forEach((file) => {
                fileInfos.push({
                    name: file,
                    url: baseUrl + '/download/' + file,
                });
            });
            res.status(200).send(fileInfos);
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get list files: ${err}` });
    }

});

export default router;
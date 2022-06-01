import uploadFile, { fileName, location, setFileInRedis } from '../../tools/fileUpload';
import { NextFunction, Router, Request, Response } from 'express';
import fs from 'fs';
import { authorize, getToken, ICritential } from '../../tools/authentication';
import Busboy from 'busboy';
import axios from 'axios';

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
        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token is expired");
            return next({ status: 401, message: "Token expired" })
        }
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
        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }
        //get file name from request params
        const fileName = req.params.fileName;
        //get directory path
        const directoryPath = __dirname + "./../../../assets/uploads/";
        //send image to client
        await res.download(directoryPath + fileName, fileName, (err) => {
            if (err) {
                req.flash("error", "File not found");
                return next({ status: 500, message: `Could not download the file: ${fileName}. ${err}` });
            }
        });
    } catch (err) {
        return next({ status: 500, message: `Could not download the file: ${fileName}. ${err}` });
    }
});


//create api for get list file upload
router.get('/list', async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }
        //get directory path
        const directoryPath = __dirname + "/../../../assets/uploads/";
        //get url 
        const baseUrl = process.env["BaseUrl"] as string;

        //read directory for get list file
        await fs.readdir(directoryPath, function (err, files) {
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

//create api for upload image to redis
router.post('/redis', async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }
        //get url api AI for send id_personnel
        const dbUri: string = process.env["API_AI_REDIS_NAME"] as string;
        //get file name from request body
        const bb = Busboy({ headers: req.headers });
        //save file in redis
        bb.on('file', async (name, file, info) => {
            file.on('data', async (data) => {
                //canvert data to base64
                let fileBase64 = data.toString('base64');
                //add to redis
                let personnel_id = await setFileInRedis(fileBase64, '123456789');

                //send error if file is not upload
                if (!personnel_id) {
                    req.flash("error", "File not upload");
                    return next({ status: 400, message: "Please upload a file!" });
                }
                //send request to AI api for send id_personnel
                await axios.post('http://127.0.0.1:8000/key', {
                    image: personnel_id,
                }).then(function (response) {
                    console.log("Response From API AI :" + response.status);
                    req.flash("info", "Uploaded the file successfully: ");
                    //send response to client
                    res.status(201).send({
                        message: "Uploaded the file successfully"
                    });
                }).catch(function (error) {
                    console.log(error.response.data);
                    return next({ status: 400, message: "There is a problem, please try again" });
                });
            });
        });
        req.pipe(bb);
    } catch (err) {
        return next({ status: 500, message: `Could not upload the file: ${req.file!.originalname}. ${err}` });
    }
});

export default router;

import uploadFile, { fileName, location, setFileInRedis, getImageFromRedis, deleteImageInRedis } from '../../tools/fileUpload';
import { NextFunction, Router, Request, Response } from 'express';
import fs from 'fs';
import { getTokenAndVerify } from '../../tools/authentication';
import axios from 'axios';
import Guid from '../../tools/createGuid';
import path from 'path';
import PersonImage from './../../models/personImage';
import multer from 'multer';
import { hashJson } from '../../tools/hash';
import HttpException from '../../error/HttpException';

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
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
        //get file from request body and save 
        await uploadFile(req, res);
        if (req.file == undefined) {
            return next(new HttpException(400, "File is required", "file"));
        }
        res.status(200).send({
            name: fileName,
            location: location,
            message: "Uploaded the file successfully: " + fileName,
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "file"));
    }
});


//create api for download image
router.get('/download/:fileName', async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
        //get file name from request params
        const fileName = req.params.fileName;
        //get directory path
        const directoryPath = __dirname + "./../../../assets/uploads/";
        //send image to client
        await res.download(directoryPath + fileName, fileName, (err) => {
            if (err) {
                req.flash("error", "File not found");
                return next(new HttpException(404, "File not found", "file"));
            }
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "file"));
    }
});


//create api for get list file upload
router.get('/list', async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
        //get directory path
        const directoryPath = __dirname + "/../../../assets/uploads/";
        //get url 
        const baseUrl = process.env["BaseUrl"] as string;

        //read directory for get list file
        await fs.readdir(directoryPath, function (err, files) {
            if (err) {
                return next(new HttpException(500, err.message, "file"));
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
    } catch (err: any) {
        return next(new HttpException(500, err.message, "file"));
    }

});


//add package multer for upload file
var storage = multer.memoryStorage();
//create multer for upload file and save in memory
var upload = multer({ storage: storage });
//create api for upload image to redis
router.post('/redis', upload.single('file'), async function (req: Request, res: Response, next: NextFunction) {
    try {
        // get id from request url
        let personnel_id = req.query.id as string;
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
        //get file from request body and save
        let fileBase64: string;
        let file = req.file!.buffer;
        //convert file to base64
        fileBase64 = file.toString('base64');
        //create hash for redis id
        let idHashed = hashJson(fileBase64, personnel_id);
        //set file in redis
        let id = await setFileInRedis(fileBase64, idHashed);
        if (!id) {
            req.flash("error", "File not upload");
            return next(new HttpException(400, "File not upload", "file"));
        }
        //get url AI for send request
        const dbUri: string = process.env["API_AI_REDIS_NAME"] as string;
        console.log(idHashed);
        //send request to AI api for send id_personnel
        await axios.post(dbUri, {
            id: idHashed
        }).then(function (response) {
            console.log("Response From API AI :" + response.status);
            req.flash("info", "Uploaded the file successfully");
            //  send response to client

        }).catch(function (error) {
            console.log(error.response.data);
            return next(new HttpException(500, error.message, "file"));
        });
        res.status(201).send({
            message: "Uploaded the file successfully"
        });
        //send error if file is not upload

    } catch (err: any) {
        return next(new HttpException(500, err.message, "file"));
    }
});

//route for verified image in redis
router.post('/verify', async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get body from request
        const { id } = req.body;
        if (!id) {
            req.flash("error", "id is required!");
            return next({ status: 400, message: "id is required" });
        }
        //get jason information from redis
        let redisData: any = await getImageFromRedis(id);
        //convert base64 to file
        let image = Buffer.from(redisData.face, 'base64');
        //covert base64 to array buffer
        let embeddingArray: Number[] = Buffer.from(redisData.embedding, 'base64').toJSON().data;
        //Face recognition condition
        if (redisData.has_face === 1) {
            let guid: string = id + "-" + Guid.newGuid();
            //create name for image
            let fileName: string = guid + ".jpg";

            //todo : convert BGR to RGB


            //define path for save image
            let pathSave = path.join(__dirname, './../../../assets/uploads/');
            //write image in path 
            await fs.writeFile(pathSave + fileName, image, (err) => {
                if (err) {
                    return next(new HttpException(500, err.message, "file"));
                }
            });
            //query to database for search personnel
            let personImage = await PersonImage.findOne({ guid: fileName }).exec();

            //create new personimage  
            personImage = new PersonImage({
                person_id: '6283724be1996b883080a495',
                guid: guid,
                vector: embeddingArray,
            });

            //  save personimage in database
            await personImage.save();
            //  delete jason image in redis
            let result = await deleteImageInRedis(id.toString());
            //   send response to client
            res.status(200).send({
                message: "Verified the file successfully"
            });
        } else if (Number(redisData.has_face) === 0) {
            req.flash("error", "No face found");
            //send response to client for not face recognition
            res.status(406).send({
                message: "No face found"
            });
        }
    } catch (err: any) {
        return next(new HttpException(500, err.message, "file"));
    }
});

export default router;

import util from 'util';
import multer from 'multer';
import fs from 'fs';
import Guid from '../tools/createGuid'
import mongoose from 'mongoose';
import redisClient from './../db/redis';


interface IFileInRedis {
    id: string;
    fullFrame: string;
    cropedFrame: string;
    featureVector: number[];
    personnel_id: string;
    timestamp: Date;
}

export let location: string;
export let fileName: string;

//define limits for file size
const maxSize = 10 * 1024 * 1024;
//define file type
let storage = multer.diskStorage({
    //define destination for file
    destination: (req, file, cb) => {
        cb(null, __dirname + "/../../assets/uploads/");
        location = __dirname + "/../../assets/uploads/";
    },
    //define file name
    filename: (req, file, cb) => {
        fileName = `${Guid.newGuid()}.jpg`;
        cb(null, fileName);
    },
});
//save file
let uploadFile = multer({
    storage: storage,
    limits: { fileSize: maxSize },
}).single("file");
//add upload file to promise for convert to nonBlocking
let uploadFileMiddleware = util.promisify(uploadFile);


//set file in redis 
export async function setFileInRedis(fileBase64: string, Personnel_id: string) {
    try {
        //  const upload = await uploadFileInMemory(Personnel_id);
        //define object for save in redis
        let fileInRedis: IFileInRedis = {
            id: Personnel_id,
            fullFrame: fileBase64,
            cropedFrame: "",
            featureVector: [],
            personnel_id: Personnel_id,
            timestamp: new Date()
        }

        //insert to redis
        await redisClient.set(fileInRedis.id, JSON.stringify(fileInRedis));
        //close redis connection
        redisClient.quit();
        //return file id
        return fileInRedis.id.toString();
    } catch (error: any) {
        console.log(error);
        throw new Error(error);
    }
}


export default uploadFileMiddleware;




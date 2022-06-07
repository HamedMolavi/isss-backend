import util from 'util';
import multer from 'multer';
import Guid from '../tools/createGuid'
import redisClient from './../db/redis';
import md5 from 'md5';


export interface IFileInRedis {
    id: string;
    full_frame: string;
    face: string;
    embedding: number[];
    has_face: number;
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
        //connet to redis if not connected
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
        //define object for save in redis
        let fileInRedis: IFileInRedis = {
            id: Personnel_id,
            full_frame: fileBase64,
            face: "",
            embedding: [],
            has_face: 1,
            timestamp: new Date()
        }

        //insert to redis
        await redisClient.set(fileInRedis.id, JSON.stringify(fileInRedis));
        //close redis connection
        redisClient.disconnect();
        //return file id
        return fileInRedis.id.toString();
    } catch (error: any) {
        console.log(error);
        throw new Error(error);
    }
}

//get image verified from redis
export async function getImageFromRedis(Personnel_id: string) {
    try {
        //connet to redis if not connected
        if (!redisClient.isOpen) {
            redisClient.connect();
        }
        let fileInRedis: IFileInRedis;
        //get file from redis
        let getFromRedis = await redisClient.get(Personnel_id);
        //convert to object
        fileInRedis = JSON.parse(getFromRedis!);
        //close redis connection
        redisClient.disconnect();
        //return file
        return fileInRedis;
    } catch (error: any) {
        console.log(error);
        throw new Error(error);
    }
}


//delete jason image in redis
export async function deleteImageInRedis(Personnel_id: string) {
    try {
        //connet to redis if not connected
        if (!redisClient.isOpen) {
            await redisClient.connect();
        }
        //delete file from redis
        let result = await redisClient.del(Personnel_id);
        //close redis connection
        redisClient.disconnect();
        //return file
        return result;
    } catch (error: any) {
        console.log(error);
        throw new Error(error);
    }
}

//function for hash json for create id save picture in redis
export function hashJson(data: string, personnel_id: string) {
    //define object for save in redis
    let fileInRedis: IFileInRedis = {
        id: personnel_id,
        full_frame: data,
        face: "",
        embedding: [],
        has_face: 1,
        timestamp: new Date()
    }
    const secretKey = process.env["KEY_HASH_OBJECT"] as string;
    //return hash object for id in redis
    return md5(JSON.stringify(fileInRedis) + secretKey);
}
export default uploadFileMiddleware;




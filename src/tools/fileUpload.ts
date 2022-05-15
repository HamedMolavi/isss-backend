import util from 'util';
import multer from 'multer';
import Guid from '../tools/createGuid'

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
        console.log(file.originalname);
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

export default uploadFileMiddleware;




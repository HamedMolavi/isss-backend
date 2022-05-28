import { Router, Request, Response, NextFunction } from "express";
import Camera, { ICamera } from "./../../models/camera";
import { authorize, getToken, ICritential } from "../../tools/authentication";

//create router for add to server 
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//add route for register new camera
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { ip, name, username, password, url, is_enabled, section_id }: ICamera = req.body;
        //verify body request
        if (!ip || !name || !username || !password || !url) {
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token: string = getToken(req, next) as string;

        //verify token
        let critential: ICritential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" });
        }

        let newCamera = new Camera();
        //query for save new Camera in DB
        Camera.findOne({
            $or: [
                { ip: ip },
                { name: name },
                { url: url },
            ]
        }, async function (err: Error, camera: ICamera | null) {
            if (err) { return next(err); }
            if (camera) {
                req.flash("error", "Camera already exists");
                return res.status(201).json({ message: "Camera already exists" });
            }
            //fill new camera
            newCamera = new Camera({
                ip: ip,
                section_id: section_id,
                name: name,
                username: username,
                password: password,
                url: url,
                is_enabled: is_enabled
            });
            //save new user in DB
            await newCamera.save(next);
            //send response to client with new camera 
            return res.status(201).json({
                message: 'Success',
                camera: newCamera
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the camera: ${err}` });
    }
});


//route for get cameras list  
router.get("/list/:page", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from params in url
        const page: number = parseInt(req.params.page) > 0 ? parseInt(req.params.page) : 1;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        const perPage: number = 5;
        //query for get cameras from DB
        let cameras = await Camera.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
        //return response to client for not found cameras
        if (!cameras) { return next(new Error("Not Found")); }
        //send response to client with camera
        return res.status(200).json({
            message: 'Success',
            cameras: cameras
        });

    } catch (err) {
        return next({ status: 500, message: `Could not get the camera: ${err}` });
    }
});

//route for get camera by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        let id: string = req.params.id;
        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get camera by id from DB
        Camera.findById(req.params.id, function (err: Error, camera: ICamera | null) {
            if (err) { return next(err); }
            if (!camera) { return next(new Error("Not Found")); }
            //send response to client with camera    
            return res.status(200).json({
                message: 'Success',
                camera: camera
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the camera: ${err}` });
    }
});


//add route for edit camera
router.put("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;

        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        const cameraBody = req.body;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }
        //query for get user by id from DB
        Camera.findByIdAndUpdate(id, { $set: cameraBody }, function (err: Error, camera: ICamera | null) {
            if (err) { return next(err); }
            if (!camera) { return next(new Error("Not Found")); }
            Camera.findById(id, function (err: Error, updateCamera: ICamera | null) {
                if (err) { return next(err); }
                //send response to client with camera
                return res.status(201).json({
                    message: 'Success',
                    camera: updateCamera
                });
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the camera: ${err}` });
    }
});


//add route for delete camera
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        let id = req.params.id;
        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get camera by username from DB
        Camera.findByIdAndDelete(id, function (err: Error, camera: ICamera | null) {
            if (err) { return next(err); }
            if (!camera) { return next(new Error("Not Found")); }
            //send response to client with camera
            return res.status(201).json({
                message: 'Success',
                camera: {}
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the user: ${err}` });
    }

});

export default router;
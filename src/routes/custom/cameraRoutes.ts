import { Router, Request, Response, NextFunction } from "express";
import Camera, { ICamera } from "./../../models/camera";
import { authorize, getToken } from "../../tools/authentication";


//define token type after verify
interface ICritential {
    id: string;
    email: string;
    role: string;
    exp: number;
    iat: number;
}

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
        const { ip, name, username, password, rstpLink } = req.body;
        //verify body request
        if (!ip || !name || !username || !password || !rstpLink) {
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
        Camera.findOne({ name: name }, async function (err: Error, camera: ICamera) {
            if (err) { return next(err); }
            if (camera) {
                req.flash("error", "Camera already exists");
                return res.status(201).json({ message: "Camera already exists" });
            }
            //fill new camera
            newCamera = new Camera({
                ip: ip,
                name: name,
                username: username,
                password: password,
                rstpLink: rstpLink
            });
            // newUser.password = await User.setPassword(password);
            //save new user in DB
            await newCamera.save(next);
            //send response to client with new camera 
            return res.status(201).json({
                message: 'Camera created',
                camera: newCamera
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the camera: ${err}` });
    }
});

//route for get cameras list  
router.get("/cameras", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as any;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get cameras from DB
        Camera.find({}, function (err: Error, cameras: any) {
            if (err) { return next(err); }
            if (!cameras) { return next(new Error("Not Found")); }
            //send response to client with camera    
            return res.status(200).json({
                message: 'Success',
                cameras: cameras
            });
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
        let critential = authorize(token) as any;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get camera by id from DB
        Camera.findById(req.params.id, function (err: Error, camera: any) {
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
        let critential = authorize(token) as any;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }
        //query for get user by id from DB
        Camera.findById(id, async function (err: Error, camera: any) {
            if (err) { return next(err); }
            if (!camera) { return next({ status: 401, message: "Not Found" }) };
            //fill camera
            let updateCamera = new Camera({
                id: id,
                ip: cameraBody.ip ?? camera.ip,
                name: cameraBody.name ?? camera.name,
                username: cameraBody.username ?? camera.username,
                password: cameraBody.password ?? camera.password,
                rstpLink: cameraBody.rstpLink ?? camera.rstpLink
            });
            //save edit user in DB
            await updateCamera.set(next);
            //return response with message and camera
            return res.status(201).json({
                message: 'Camera Edited',
                camera: updateCamera
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the camera: ${err}` });
    }
});


//add route for delete camera
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
    try {
        let id = req.params.id;
        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as any;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get camera by username from DB
        Camera.findById(id, async function (err: Error, camera: any) {
            if (err) { return next(err); }
            if (!camera) { return next(new Error("Not Found")); }
            //delete camera in DB
            await camera.delete(next);
            //send response to client with camera
            return res.status(201).json({
                message: 'camera Deleted',
                camera: {}
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the user: ${err}` });
    }

});

export default router;
import { Router, Request, Response, NextFunction } from "express";
import Camera from "./../models/camera";
import { authorize, getToken } from "../tools/authentication";


//define token type after verify
interface ICritential {
    id: string;
    email: string;
    role: string;
    exp: number;
    iat: number;
}
//define camera type 
interface ICamera {
    ip: string,
    name: string,
    username: string;
    password: string;
    rstpLink: string;
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
router.post("/camera", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { ip, name, username, password, rstpLink } = req.body;

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
        Camera.findOne({ name: name }, function (err: Error, camera: ICamera) {
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
            newCamera.save(next);
            //send response to client with new user 
            return res.status(201).json({
                message: 'Camera created',
                camera: newCamera
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the user: ${err}` });
    }
});

export default router;
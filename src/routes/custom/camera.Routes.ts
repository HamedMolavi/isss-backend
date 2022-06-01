import { Router, Request, Response, NextFunction } from "express";
import Camera, { ICamera } from "../../models/camera";
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
        const { network, departement_id, section_id, url, ip, name, username, password, is_enabled }: ICamera = req.body;
        //verify body request
        if (!network || !departement_id || !section_id || !url || !ip || !name || !username || !password || !is_enabled) {
            req.flash("error", "Veuillez remplir tous les champs");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token: string = getToken(req, next) as string;

        //verify token
        let critential: ICritential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" });
        }

        //query for save new Camera in DB
        let camera = await Camera.findOne({
            $or: [
                { ip: ip },
                { name: name },
                { url: url },
            ]
        }).exec();

        //return error if camera already exist
        if (camera) {
            req.flash("error", "camera already exist");
            return next({ status: 200, message: "camera already exist" });
        }

        //fil new camera
        camera = new Camera({
            network: network,
            departement_id: departement_id,
            section_id: section_id,
            url: url,
            ip: ip,
            name: name,
            username: username,
            password: password,
            is_enabled: is_enabled,
        });

        //save camera in DB
        await camera.save();

        //return success
        req.flash("info", "camera added");
        return res.status(201).json({
            message: 'Success',
            camera: camera
        });
    } catch (err) {
        return next({ status: 500, message: `Could not the camera: ${err}` });
    }
});

//route for get camera with search from DB 
router.get("/find", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get param from url
        let search = req.query.search as string;
        let strLimit = req.query.limit as string;
        let limit = parseInt(strLimit) > 0 ? parseInt(strLimit) : 1;
        if (!search) {
            req.flash("error", "Search is required");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }

        //query for search camera by id from DB
        let camera = await Camera.find({
            name: { $regex: search, $options: "i" }
        }).limit(limit).exec();

        //return response not found to client if not found camera
        if (!camera) {
            req.flash("error", "Camera not found");
            return next(new Error("Not Found"));
        }
        //return response to client with camera
        return res.status(200).json({
            message: "Success",
            camera: camera,
            limit: limit,
            total: await Camera.countDocuments().exec(),
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the camera: ${err}` });
    }
});



//route for get cameras list  
router.get("/list", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

        //get token from header request
        let token = getToken(req, next) as string;
        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }
        //query for get cameras list
        let cameras = await Camera.find({}).limit(perPage).skip(perPage * (page - 1)).exec();

        //return response not found to client if not found cameras
        if (!cameras) {
            req.flash("error", "Cameras not found");
            return next(new Error("Not Found"));
        }

        //return response to client with departements list
        return res.status(200).json({
            message: "Success",
            cameras: cameras,
            page: page,
            perPage: perPage,
            total: await Camera.countDocuments().exec(),
            pages: Math.ceil(await Camera.countDocuments().exec() / perPage)
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the departements: ${err}` });
    }
});

//route for get camera by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from params in url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "id not found");
            return next({ status: 400, message: "Bad request" });
        }
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }

        //query for get camera by id from DB
        let camera = await Camera.findById(id).exec();

        //return error if camera not found
        if (!camera) {
            req.flash("error", "camera not found");
            return next({ status: 200, message: "Not Found" });
        }

        //send response to client with camera
        return res.status(200).json({
            message: 'Success',
            camera: camera
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
        if (!id) {
            req.flash("error", "id not found");
            return next({ status: 400, message: "Bad request" });
        }
        //get jason from body request
        const cameraBody = req.body;
        //get token from header request
        let token: string = getToken(req, next) as string;

        //verify token
        let critential: ICritential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }
        //query for get user by id from DB
        let camera = await Camera.findByIdAndUpdate(id, cameraBody, { new: true }).exec();
        //return error if user not found
        if (!camera) {
            req.flash("error", "camera not found");
            return next({ status: 200, message: "Not Found" });
        }
        //send response to client with user
        return res.status(201).json({
            message: 'Success',
            camera: camera
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the camera: ${err}` });
    }
});


//add route for delete camera
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id = req.params.id;
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Token expired");
            return next({ status: 401, message: "Token expired" })
        }

        //query for get camera by username from DB
        let camera = await Camera.findByIdAndDelete(id).exec();
        //return error if camera not found
        if (!camera) {
            req.flash("error", "camera not found");
            return next({ status: 200, message: "Not Found" });
        }
        //send response to client with camera
        return res.status(201).json({
            message: 'Success',
            camera: camera
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the user: ${err}` });
    }

});

export default router;
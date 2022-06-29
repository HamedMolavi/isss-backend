import { Router, Request, Response, NextFunction } from "express";
import HttpException from "./../../../error/HttpException";
import Camera, { ICamera } from "./../../../models/camera";
import { getTokenAndVerify } from "./../../../tools/authentication";

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
router.post("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { network, departement_id, section_id, url, ip, name, username, password, is_enabled }: ICamera = req.body;
        //verify body request
        if (!network || !departement_id || !section_id || !url || !ip || !name || !username || !password || !is_enabled) {
            req.flash("error", "Veuillez remplir tous les champs");
            return next(new HttpException(400, "Veuillez remplir tous les champs", "camera"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

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
            return next(new HttpException(400, "camera already exist", "camera"));
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
    } catch (err: any) {
        return next(new HttpException(500, err.message, "camera"));
    }
});


//route for get cameras list  
router.get("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        let search = req.query.search as string || "";
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
        let cameras: ICamera[] = [];
        //query for get cameras list
        if (search !== "") {
            cameras = await Camera.find({
                name: { $regex: search, $options: "i" }
            }).skip((page - 1) * perPage).limit(perPage).exec();
        } else {
            cameras = await Camera.find({}).limit(perPage).skip(perPage * (page - 1)).exec();
        }

        //return response not found to client if not found cameras
        if (!cameras) {
            req.flash("error", "Cameras not found");
            return next(new HttpException(404, "Cameras not found", "camera"));
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
    } catch (err: any) {
        return next(new HttpException(500, err.message, "camera"));
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
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get camera by id from DB
        let camera = await Camera.findById(id).exec();

        //return error if camera not found
        if (!camera) {
            req.flash("error", "camera not found");
            return next(new HttpException(404, "camera not found", "camera"));
        }

        //send response to client with camera
        return res.status(200).json({
            message: 'Success',
            camera: camera
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "camera"));
    }
});

//add route for edit camera
router.patch("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "id not found");
            return next(new HttpException(400, "Bad request", "camera"));
        }
        //get jason from body request
        const cameraBody = req.body;
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);
        //query for get user by id from DB
        let camera = await Camera.findByIdAndUpdate(id, cameraBody, { new: true }).exec();
        //return error if user not found
        if (!camera) {
            req.flash("error", "camera not found");
            return next(new HttpException(404, "camera not found", "camera"));
        }
        //send response to client with user
        return res.status(201).json({
            message: 'Success',
            camera: camera
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "camera"));
    }
});


//add route for delete camera
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id = req.params.id;
        if (!id) {
            return next(new HttpException(400, "Bad request", "camera"));
        }

        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //query for get camera by username from DB
        let camera = await Camera.findByIdAndDelete(id).exec();
        //return error if camera not found
        if (!camera) {
            req.flash("error", "camera not found");
            return next(new HttpException(404, "camera not found", "camera"));
        }
        //send response to client with camera
        return res.status(201).json({
            message: 'Success',
            camera: camera
        });
    } catch (err: any) {
        return next(new HttpException(500, err.message, "camera"));
    }

});

export default router;
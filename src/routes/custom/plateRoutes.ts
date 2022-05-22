import { Router, Request, Response, NextFunction } from "express";
import Plate, { IPlate } from "../../models/plate";
import { authorize, getToken, ICritential } from "./../../tools/authentication";


//create router for add to routes file 
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//add route for register new plate
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { number, carBrand, color, owner } = req.body;
        //verify body request
        if (!number || !carBrand || !color || !owner) {
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

        let newPlate = new Plate();
        //query for save new plate in DB
        Plate.findOne({ number: number }, async function (err: Error, plate: IPlate | null) {
            if (err) { return next(err); }
            if (plate) {
                req.flash("error", "plate already exists");
                return res.status(201).json({ message: "plate already exists" });
            }
            //fill new plate
            newPlate = new Plate({
                number: number,
                carBrand: carBrand,
                color: color,
                owner: owner
            });

            //save new plate in DB
            await newPlate.save(next);
            //send response to client with new plate 
            return res.status(201).json({
                message: 'plate created',
                plate: newPlate
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the plate: ${err}` });
    }
});

//route for get plate list  
router.get("/plates", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get plate from DB
        Plate.find({}, function (err: Error, plates: IPlate[] | null) {
            if (err) { return next(err); }
            if (!plates) { return next(new Error("Not Found")); }
            //send response to client with plates    
            return res.status(200).json({
                message: 'Success',
                plates: plates
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the plates: ${err}` });
    }
});

//route for get plate by id from DB 
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

        //query for get plate by id from DB
        Plate.findById(id, function (err: Error, plate: IPlate | null) {
            if (err) { return next(err); }
            if (!plate) { return next(new Error("Not Found")); }
            //send response to client with plate    
            return res.status(200).json({
                message: 'Success',
                plate: plate
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the plate: ${err}` });
    }
});


//add route for edit plate
router.put("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;

        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        const plateBody = req.body;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }
        //query for get plate by id from DB
        Plate.findById(id, async function (err: Error, plate: IPlate | null) {
            if (err) { return next(err); }
            if (!plate) { return next({ status: 401, message: "Not Found" }) };
            //update plate model
            let updatePlate = new Plate({
                id: id,
                number: plateBody.number ?? plate.number,
                carBrand: plateBody.carBrand ?? plate.carBrand,
                color: plateBody.color ?? plate.color,
                owner: plateBody.owner ?? plate.owner
            });
            //save edit plate in DB
            await updatePlate.set(next);
            //return response with message and plate
            return res.status(201).json({
                message: 'plate Edited',
                plate: updatePlate
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the plate: ${err}` });
    }
});


//add route for delete plate
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
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

        //query for get plate by id from DB
        Plate.findById(id, async function (err: Error, plate: any) {
            if (err) { return next(err); }
            if (!plate) { return next(new Error("Not Found")); }
            //delete plate in DB
            await plate.delete(next);
            //send response to client with plate
            return res.status(201).json({
                message: 'plate Deleted',
                plate: {}
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the plate: ${err}` });
    }

});

export default router;
import { Router, Request, Response, NextFunction } from "express";
import Departement, { IDepartement } from "./../../models/departement";
import { authorize, getToken, ICritential } from "./../../tools/authentication";

//create router for add to server file 
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//add route for register new departement
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name } = req.body;
        //verify body request
        if (!name) {
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

        let newDepartement = new Departement();
        //query for save new departement in DB
        Departement.findOne({ name: name }, async function (err: Error, departement: IDepartement | null) {
            if (err) { return next(err); }
            if (departement) {
                req.flash("error", "departement already exists");
                return res.status(201).json({ message: "departement already exists" });
            }
            //fill new departement
            newDepartement = new Departement({
                name: name
            });

            //save new departement in DB
            await newDepartement.save(next);
            //send response to client with new departement 
            return res.status(201).json({
                message: 'departement created',
                departement: newDepartement
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the departement: ${err}` });
    }
});

//route for get departements list  
router.get("/list", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get departements from DB
        Departement.find({}, function (err: Error, departements: IDepartement[] | null) {
            if (err) { return next(err); }
            if (!departements) { return next(new Error("Not Found")); }
            //send response to client with departement    
            return res.status(200).json({
                message: 'Success',
                departements: departements
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the departements: ${err}` });
    }
});

//route for get departement by id from DB 
router.get("/:id", function (req: Request, res: Response, next: NextFunction) {
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

        //query for get departement by id from DB
        Departement.findById(id, function (err: Error, departement: IDepartement | null) {
            if (err) { return next(err); }
            if (!departement) { return next(new Error("Not Found")); }
            //send response to client with departement    
            return res.status(200).json({
                message: 'Success',
                departement: departement
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the departement: ${err}` });
    }
});


//add route for edit departement
router.put("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;

        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        const departementBody = req.body;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }
        //query for get camera by id from DB and update
        Departement.findByIdAndUpdate(id, { $set: departementBody }, function (err: Error, departement: IDepartement | null) {
            if (err) { return next(err); }
            if (!departement) { return next(new Error("Not Found")); }
            Departement.findById(id, async function (err: Error, updateDepartement: IDepartement | null) {
                if (err) { return next(err); }
                //send response to client with departement
                return res.status(201).json({
                    message: 'Success',
                    departement: updateDepartement
                });
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the departement: ${err}` });
    }
});


//add route for delete departement
router.delete("/:id", async function (req: any, res: any, next: NextFunction) {
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

        //query for get departement by id from DB
        Departement.findByIdAndDelete(id, function (err: Error, departement: IDepartement | null) {
            if (err) { return next(err); }
            if (!departement) { return next(new Error("Not Found")); }
            //send response to client with departement
            return res.status(201).json({
                message: 'Success',
                departement: departement
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the departement: ${err}` });
    }

});

export default router;
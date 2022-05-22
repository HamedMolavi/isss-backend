import { Router, Request, Response, NextFunction } from "express";
import Personnel from "./../../models/personnel";
import { authorize, getToken } from "./../../tools/authentication";


//define token type after verify
interface ICritential {
    id: string;
    email: string;
    role: string;
    exp: number;
    iat: number;
}
//define perssonel type 
interface IPersonnel {
    id: string;
    name: string;
    family: string;
    phone: string;
    jobTitle: string;
}


//create router for add to routes file 
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//add route for register new personnel
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name, family, phone, jobTitle } = req.body;
        //verify body request
        if (!name || !family || !phone || !jobTitle) {
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

        let newPersonnel = new Personnel();
        //query for save new personnel in DB
        Personnel.findOne({ name: name }, async function (err: Error, personnel: IPersonnel | null) {
            if (err) { return next(err); }
            if (personnel) {
                req.flash("error", "personnel already exists");
                return res.status(201).json({ message: "personnel already exists" });
            }
            //fill new personnel
            newPersonnel = new Personnel({
                name: name,
                family: family,
                phone: phone,
                jobTitle: jobTitle ?? null
            });

            //save new personnel in DB
            await newPersonnel.save(next);
            //send response to client with new personnel 
            return res.status(201).json({
                message: 'personnel created',
                personnel: newPersonnel
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the personnel: ${err}` });
    }
});

//route for get personnels list  
router.get("/personnels", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as any;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get personnels from DB
        Personnel.find({}, function (err: Error, personnels: IPersonnel[] | null) {
            if (err) { return next(err); }
            if (!personnels) { return next(new Error("Not Found")); }
            //send response to client with personnels    
            return res.status(200).json({
                message: 'Success',
                personnels: personnels
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the personnels: ${err}` });
    }
});

//route for get personnels by id from DB 
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

        //query for get personnel by id from DB
        Personnel.findById(id, function (err: Error, personnel: IPersonnel | null) {
            if (err) { return next(err); }
            if (!personnel) { return next(new Error("Not Found")); }
            //send response to client with personnel    
            return res.status(200).json({
                message: 'Success',
                personnel: personnel
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the personnel: ${err}` });
    }
});


//add route for edit personnel
router.put("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id = req.params.id as Object;

        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        const personnelBody = req.body;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as any;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }
        //query for get personnel by id from DB
        Personnel.findById(id, async function (err: Error, personnel: IPersonnel | null) {
            if (err) { return next(err); }
            if (!personnel) { return next({ status: 401, message: "Not Found" }) };
            //update personnel model
            let updatePersonnel = new Personnel({
                id: id,
                name: personnelBody.name ?? personnel.name,
                family: personnelBody.family ?? personnel.family,
                phone: personnelBody.phone ?? personnel.phone,
                jobTitle: personnelBody.jobTitle ?? personnel.jobTitle
            });
            //save edit personnel in DB
            await updatePersonnel.set(next);
            //return response with message and personnel
            return res.status(201).json({
                message: 'personnel Edited',
                personnel: updatePersonnel
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the personnel: ${err}` });
    }
});


//add route for delete personnel
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

        //query for get personnel by id from DB
        Personnel.findById(id, async function (err: Error, personnel: any) {
            if (err) { return next(err); }
            if (!personnel) { return next(new Error("Not Found")); }
            //delete personnel in DB
            await personnel.delete(next);
            //send response to client with personnel
            return res.status(201).json({
                message: 'personnel Deleted',
                personnel: {}
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the personnel: ${err}` });
    }

});

export default router;
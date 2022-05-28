import { Router, Request, Response, NextFunction } from "express";
import Section, { ISection } from "./../../models/section";
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


//add route for register new section
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { name, departement_id }: ISection = req.body;
        //verify body request
        if (!name || !departement_id) {
            req.flash("error", "Please enter all fields");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token: string = getToken(req, next) as string;

        //verify token
        let critential: ICritential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Your token has expired");
            return next({ status: 401, message: "Token expired" });
        }

        //query for save new section in DB
        let section = await Section.findOne({ name: name }).exec();

        //check if section exist
        if (section) {
            req.flash("error", "Section already exist");
            return next({ status: 200, message: "Section already exist" });
        }

        //set section data
        let newSection = new Section();
        newSection.name = name;
        newSection.departement_id = departement_id;

        //save section in DB
        await newSection.save();
        req.flash("info", "Section has been registered");
        //send response
        return res.status(201).json({
            message: "section created",
            section: newSection
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the section: ${err}` });
    }
});

//route for get sections list  
router.get("/list", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request
        let token: string = getToken(req, next) as string;

        //verify token
        let critential: ICritential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Your token has expired");
            return next({ status: 401, message: "Token expired" })
        }
        //query for get sections from DB
        let sections = await Section.find({}).exec();
        //return not found if sections not exist
        if (!sections) {
            req.flash("error", "Section not found"); 
            return next(new Error("Not Found")); 
        }
        //send response
        return res.status(200).json({
            message: "Success",
            sections: sections
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the sections: ${err}` });
    }
});

//route for get section by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id: string = req.params.id;
        if (!id) {
            req.flash("error", "Please enter all fields");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Your token has expired");
            return next({ status: 401, message: "Token expired" })
        }

        //query for get section by id from DB
        let section = await Section.findById(id).exec();
        //return not found if section not exist
        if (!section) {
            req.flash("error", "Section not found");
            return next(new Error("Not Found"));
        }
        //send response
        return res.status(200).json({
            message: "Success",
            section: section
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the section: ${err}` });
    }
});


//add route for edit section
router.put("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id = req.params.id as Object;
        if (!id) {
            req.flash("error", "Please enter all fields");
            return next({ status: 400, message: "Bad request" });
        }
        //get jason from body request
        const sectionBody = req.body;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Your token has expired");
            return next({ status: 401, message: "Token expired" })
        }
        //query for get section by id from DB
        let section = await Section.findByIdAndUpdate(id, sectionBody, { new: true }).exec();
        //return not found if section not exist
        if (!section) {
            req.flash("error", "Section not found");
            return next(new Error("Not Found"));
        }
        //send response
        return res.status(201).json({
            message: "Success",
            section: section
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the section: ${err}` });
    }
});


//add route for delete section
router.delete("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id = req.params.id;
        if (!id) {
            req.flash("error", "Please enter id");
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token : string = getToken(req, next) as string;

        //verify token
        let critential : ICritential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            req.flash("error", "Your token has expired");
            return next({ status: 401, message: "Token expired" })
        }

        //query for get section by id from DB
        let section = await Section.findByIdAndDelete(id).exec();
        //return not found if section not exist
        if (!section) {
            req.flash("error", "Section not found");
            return next(new Error("Not Found"));
        }
        //send response
        return res.status(201).json({
            message: "Success",
            section: section
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the section: ${err}` });
    }

});

export default router;
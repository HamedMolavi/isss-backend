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
        const { name, department } = req.body;
        //verify body request
        if (!name || !department) {
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

        let newSection = new Section();
        //query for save new section in DB
        Section.findOne({ name: name }, async function (err: Error, section: ISection) {
            if (err) { return next(err); }
            if (section) {
                req.flash("error", "section already exists");
                return res.status(201).json({ message: "section already exists" });
            }
            //fill new section
            newSection = new Section({
                name: name,
                departement: department ?? null
            });

            //save new section in DB
            await newSection.save(next);
            //send response to client with new section 
            return res.status(201).json({
                message: 'section created',
                section: newSection
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the section: ${err}` });
    }
});

//route for get sections list  
router.get("/sections", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get sections from DB
        Section.find({}, function (err: Error, sections: ISection[] | null) {
            if (err) { return next(err); }
            if (!sections) { return next(new Error("Not Found")); }
            //send response to client with sections    
            return res.status(200).json({
                message: 'Success',
                sections: sections
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the sections: ${err}` });
    }
});

//route for get section by id from DB 
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

        //query for get section by id from DB
        Section.findById(id, function (err: Error, section: ISection | null) {
            if (err) { return next(err); }
            if (!section) { return next(new Error("Not Found")); }
            //send response to client with section    
            return res.status(200).json({
                message: 'Success',
                section: section
            });
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

        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }

        const sectionBody = req.body;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }
        //query for get section by id from DB
        Section.findByIdAndUpdate(id, { $set: sectionBody }, function (err: Error, section: ISection | null) {
            if (err) { return next(err); }
            if (!section) { return next(new Error("Not Found")); }
            Section.findById(id, async function (err: Error, updateSection: ISection | null) {
                if (err) { return next(err); }
                //send response to client with section
                return res.status(201).json({
                    message: 'Success',
                    section: updateSection
                });
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the section: ${err}` });
    }
});


//add route for delete section
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
        let critential = authorize(token) as any;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        }

        //query for get section by id from DB
        Section.findByIdAndDelete(id, function (err: Error, section: ISection | null) {
            if (err) { return next(err); }
            if (!section) { return next(new Error("Not Found")); }
            //send response to client with message
            return res.status(201).json({
                message: 'Success',
                section: section
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the section: ${err}` });
    }

});

export default router;
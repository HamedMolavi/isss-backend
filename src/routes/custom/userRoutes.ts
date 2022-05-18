import { Router, Request, Response, NextFunction } from 'express';
import User from '../../models/user';
import { authorize, getToken } from "../../tools/authentication";

//define user type
interface IUser {
    name: string;
    username: string;
    password: string;
    email: string;
    role: string;
};
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

//add route for register new user
router.post("/register", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get jason from body request
        const { username, password, name, email, role } = req.body;

        //verify body request
        if (!username || !password || !name || !email || !role) {
            return next({ status: 400, message: "Bad request" });
        }

        //get token from header request
        let token: string = getToken(req, next) as string;

        //verify token
        let critential: ICritential = authorize(token) as ICritential;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" });
        } else if (critential.role !== "admin") {
            return next({ status: 401, message: "Unauthorized" });
        }

        let newUser = new User();
        //query for save new user in DB
        User.findOne({ username: username }, async function (err: Error, user: IUser) {
            if (err) { return next(err); }
            if (user) {
                req.flash("error", "User already exists");
                return res.status(201).json({ message: "User already exists" });
            }

            newUser = new User({
                username: username,
                password: password,
                name: name,
                email: email,
                role: role
            });
            // newUser.password = await User.setPassword(password);
            //save new user in DB
            await newUser.save(next);
            //send response to client with new user 
            return res.status(201).json({
                message: 'User created',
                user: newUser
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not create the user: ${err}` });
    }


});

//route for get users list  
router.get("/users", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as any;
        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        } else if (critential.role !== "admin") {
            return next({ status: 401, message: "Unauthorized" });
        }

        //query for get user by username from DB
        User.find({}, async function (err: Error, users: any) {
            if (err) { return next(err); }
            if (!users) { return next(new Error("Not Found")); }
            //send response to client with user    
            return res.status(200).json({
                message: 'Success',
                users: users
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the user: ${err}` });
    }

});


//route for get user by id from DB 
router.get("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        let id : string = req.params.id;
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
        } else if (critential.role !== "admin") {
            return next({ status: 401, message: "Unauthorized" });
        }

        //query for get user by id from DB
        User.findById(id, function (err: Error, user: any) {
            if (err) { return next(err); }
            if (!user) { return next(new Error("Not Found")); }
            //send response to client with user    
            return res.status(200).json({
                message: 'Success',
                user: user
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not get the user: ${err}` });
    }

});

//add route for edit user
router.put("/:id", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get id from url
        let id = req.params.id as Object;
        //verify body request
        if (!id) {
            return next({ status: 400, message: "Bad request" });
        }
        const userBody = req.body;
        //get token from header request
        let token = getToken(req, next) as string;

        //verify token
        let critential = authorize(token) as any;

        //check time expire token and role
        if (critential.exp < Date.now() / 1000) {
            return next({ status: 401, message: "Token expired" })
        } else if (critential.role !== "admin") {
            return next({ status: 401, message: "Unauthorized" });
        }
        //query for get user by username from DB
        User.findById(id, async function (err: Error, user: any) {
            if (err) { return next(err); }
            if (!user) { return next({ status: 401, message: "Not Found" }) };
            //check token with user
            let updateUser = new User({
                id: id,
                name: userBody.name ?? user.name,
                email: userBody.email ?? user.email,
                username: userBody.username ?? user.username,
                password: userBody.password ?? user.password,
                role: userBody.role ?? user.role
            });
            //save edit user in DB
            await updateUser.set(next);
            //return response with message and user
            return res.status(201).json({
                message: 'User Edited',
                user: updateUser
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not edit the user: ${err}` });
    }

});


//add route for delete user
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
        } else if (critential.role !== "admin") {
            return next({ status: 401, message: "Unauthorized" });
        }

        //query for get user by id from DB
        User.findById(id, async function (err: Error, user: any) {
            if (err) { return next(err); }
            if (!user) { return next(new Error("Not Found")); }
            //delete user in DB
            await user.delete(next);
            //return response with message 
            return res.status(201).json({
                message: 'User Deleted',
                user: {}
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not delete the user: ${err}` });
    }

});

//api for login user
router.post("/login", async function (req: Request, res: Response, next: Function) {
    try {
        //get jason from body request
        const { username, password } = req.body;
        //verify body request
        if (!username || !password) {
            return next({ status: 400, message: "Bad request" });
        }
        //get user from DB
        User.findOne({ username: username }, function (err: Error, user: any) {
            if (err) { return next(err) };
            if (!user) {
                return next(new Error("No user has that username!"));
            }
            //verify password
            user.checkPassword(password, function (err: Error, isMatch: Function) {
                console.log(isMatch);
                if (err) { return next(err); }
                if (isMatch) {
                    return res.status(200).json({
                        message: 'Success',
                        user: user
                    });
                } else {
                    return next(null, false, { message: "Invalid password." });
                }
            });
        });
    } catch (err) {
        return next({ status: 500, message: `Could not login: ${err}` });
    }

});

export default router;
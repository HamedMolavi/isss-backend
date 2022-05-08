import passport from "passport";
import User from "../models/user";
import passportLocal from "passport-local";

interface IUser {
    id : string;
    username: string;
    password: string;
    createdAt: Date;
    displayName: string;
    bio: string;
}

const LocalStrategy = passportLocal.Strategy;

function setuppassport() {
    passport.serializeUser(function (user: any, done: Function) {
        done(null, user.id);
    });

    passport.deserializeUser(function (id: any, done: Function) {
        User.findById(id, function (err: Error, user: any) {
            done(err, user);
        });
    });
    passport.use("login", new LocalStrategy(
        function (username: any, password: any, done: Function) {
            User.findOne({ username: username }, function (err: Error, user: any) {
                if (err) { return done(err) };
                if (!user) {
                    return done(null, false, { message: "No user has that username!" });
                }
                user.checkPassword(password, function (err: Error, isMatch: Function) {
                    if (err) { return done(err); }
                    if (isMatch) {
                        return done(null, user);
                    } else {
                        return done(null, false, { message: "Invalid password." });
                    }
                });
            });
        }));
}

export default setuppassport;
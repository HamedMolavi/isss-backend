"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const user_1 = __importDefault(require("../models/user"));
const passport_local_1 = __importDefault(require("passport-local"));
const LocalStrategy = passport_local_1.default.Strategy;
//create local strategy for passport authentication (login) with username and password 
function setuppassport() {
    passport_1.default.serializeUser(function (user, done) {
        done(null, user.id);
    });
    passport_1.default.deserializeUser(function (id, done) {
        user_1.default.findById(id, function (err, user) {
            done(err, user);
        });
    });
    // passport.use("login", new LocalStrategy(
    //for authentication user with username and password
    passport_1.default.use(new LocalStrategy(function (username, password, done) {
        user_1.default.findOne({ username: username }, function (err, user) {
            if (err) {
                return done(err);
            }
            ;
            if (!user) {
                return done(null, false, { message: "No user has that username!" });
            }
            user.checkPassword(password, function (err, isMatch) {
                if (err) {
                    return done(err);
                }
                if (isMatch) {
                    return done(null, user);
                }
                else {
                    return done(null, false, { message: "Invalid password." });
                }
            });
        });
    }));
}
exports.default = setuppassport;

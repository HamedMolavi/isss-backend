"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = __importDefault(require("dotenv"));
//initial file .env
dotenv_1.default.config();
//create user model with schema for save in DB
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    token: { type: String, required: true },
});
//for encrypt password
const SALT_FACTOR = 10;
UserSchema.pre("save", function (done) {
    var user = this;
    if (!user.isModified("password")) {
        return done();
    }
    bcrypt_1.default.genSalt(SALT_FACTOR, function (err, salt) {
        if (err) {
            return done(err);
        }
        bcrypt_1.default.hash(user.password, salt, function (err, hashedPassword) {
            if (err) {
                return done(err);
            }
            user.password = hashedPassword;
            done();
        });
    });
});
//check password
UserSchema.methods.checkPassword = function (guess, done) {
    console.log(typeof guess);
    bcrypt_1.default.compare(guess, this.password, function (err, isMatch) {
        done(err, isMatch);
    });
};
//for encrypt password
// UserSchema.methods.setPassword = async function (password: string) {
//     const hash = await bcrypt.hash(password, 10);
//     this.hashedPassword = hash;
// };
// //check password
// UserSchema.methods.checkPassword = async function (password: string) {
//     const result = await bcrypt.compare(password, this.hashedPassword);
//     return result;
// };
//find user by username
UserSchema.statics.findByUsername = function (username) {
    return this.findOne({ username });
};
//get secrect key jwt token
const secret = process.env["JWT_SECRET"];
//generate jwt token
UserSchema.methods.generateJWT = function () {
    const today = new Date();
    const expirationDate = new Date(today);
    expirationDate.setDate(today.getDate() + 30);
    return jsonwebtoken_1.default.sign({
        id: this._id,
        email: this.email,
        role: this.role,
        exp: parseInt((expirationDate.getTime() / 1000).toString(), 10),
    }, secret);
};
//get user data jason for auth
UserSchema.methods.toAuthJSON = function () {
    return {
        _id: this._id,
        name: this.name,
        username: this.username,
        password: this.password,
        email: this.email,
        role: this.role,
        token: this.generateJWT(),
    };
};
//create model for user
const User = mongoose_1.default.model("User", UserSchema);
exports.default = User;

import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";


//initial file .env
dotenv.config();
//create user type 
export interface IUser {
    _id: mongoose.Types.ObjectId;
    username: string;
    password: string;
    phone_number: string;
    role: string;
    event : boolean;
    camera : boolean;
    report : boolean;
    configuration : boolean;
    views : boolean;
    created_date: Date;
}

interface IUserDocument extends IUser, Document {
    _id: mongoose.Types.ObjectId;
    setPassword: (password: string) => Promise<void>;
    checkPassword: (password: string) => Promise<boolean>;
    generateJWT: () => any;
    toAuthJSON: () => any;
}

interface IUserModel extends Model<IUserDocument> {
    checkPassword: (password: string) => Promise<boolean>;
    setPassword: (password: string) => Promise<boolean>;
    generateJWT: () => any;
    toAuthJSON: () => any;
}

//create user model with schema for save in DB
const UserSchema: Schema<IUserDocument> = new Schema({
    username: { type: String, required: true },
    password: { type: String, required: true },
    phone_number: { type: String, required: true },
    event: { type: Boolean, default: false },
    camera: { type: Boolean, default: false },
    report: { type: Boolean, default: false },
    configuration: { type: Boolean, default: false },
    role: { type: String, required: true },
    created_date: { type: Date, default: Date.now },
},{
    collection: "User"
});

//for encrypt password
const SALT_FACTOR = 10;
UserSchema.pre("save", function (done: Function) {
    var user = this;
    if (!user.isModified("password")) {
        return done();
    }
    bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
        if (err) { return done(err); }
        bcrypt.hash(user.password, salt,
            function (err, hashedPassword) {
                if (err) { return done(err); }
                user.password = hashedPassword;
                done();
            });
    });
});

//check password
UserSchema.methods.checkPassword = function (guess: string, done: Function) {
    bcrypt.compare(guess, this.password, function (err, isMatch) {
        done(err, isMatch);
    });
}

//get secrect key jwt token
const secret = process.env["JWT_SECRET"] as string;

//generate jwt token
UserSchema.methods.generateJWT = function () {
    const today = new Date();
    const expirationDate = new Date(today);
    expirationDate.setDate(today.getDate() + 30);

    return jwt.sign({
        id: this._id,
        email: this.email,
        role: this.role,
        exp: parseInt((expirationDate.getTime() / 1000).toString(), 10),
    }, secret);
}

//get user data jason for auth
UserSchema.methods.toAuthJSON = function () {
    return {
        _id: this._id,
        name: this.name,
        username: this.username,
        password: this.password,
        email: this.email,
        role: this.role,
        event : this.event,
        camera : this.camera,
        report : this.report,
        configuration : this.configuration,
        create_date: this.created_date,
        token: this.generateJWT(),
    };
};

// Compile model from schema
const User = mongoose.model<IUserDocument, IUserModel>("User", UserSchema);
export default User;
import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";


//initial file .env
dotenv.config();

interface IUser {
    name: string,
    email: string,
    username: string;
    password: string;
    role: string;
}

interface IUserDocument extends IUser, Document {
    setPassword: (password: string) => Promise<void>;
    checkPassword: (password: string) => Promise<boolean>;
    generateJWT: () => any;
    toAuthJSON: () => any;
}

interface IUserModel extends Model<IUserDocument> {
    findByUsername: (username: string) => Promise<IUserDocument>;
    checkPassword: (password: string) => Promise<boolean>;
    generateJWT: () => any;
    toAuthJSON: () => any;
}

//create user model with schema for save in DB
const UserSchema: Schema<IUserDocument> = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
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
    console.log(typeof guess);
    bcrypt.compare(guess, this.password, function (err, isMatch) {
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
UserSchema.statics.findByUsername = function (username: string) {
    return this.findOne({ username });
};

//find user by id
UserSchema.statics.findByIdAndUpdate = function (id: string) {
    return this.findById(id);
};

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
        token: this.generateJWT(),
    };
};

//create model for user
const User = mongoose.model<IUserDocument, IUserModel>("User", UserSchema);
export default User;
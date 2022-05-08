import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";


interface IUser {
    name: string,
    email: string,
    username: string;
    password: string;
}

interface IUserDocument extends IUser, Document {
    setPassword: (password: string) => Promise<void>;
    checkPassword: (password: string) => Promise<boolean>;
    generateJWT: () => any;
    toAuthJSON: () => any;
}

interface IUserModel extends Model<IUserDocument> {
    findByUsername: (username: string) => Promise<IUserDocument>;
}

const UserSchema: Schema<IUserDocument> = new Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
});
// const SALT_FACTOR = 10;
// var noop = function () { };
// UserSchema.pre("save", function (done) {
//     var user = this;
//     if (!user.isModified("password")) {
//         return done();
//     }
//     bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
//         if (err) { return done(err); }
//         bcrypt.hash(user.password, salt,
//             function (err, hashedPassword) {
//                 if (err) { return done(err); }
//                 user.password = hashedPassword;
//                 done();
//             });
//     });
// });

// UserSchema.methods.checkPassword = function (guess: string, done: Function) {
//     console.log(typeof guess);
//     bcrypt.compare(guess, this.password, function (err, isMatch) {
//         done(err, isMatch);
//     });
// };

UserSchema.methods.setPassword = async function (password: string) {
    const hash = await bcrypt.hash(password, 10);
    this.hashedPassword = hash;
};

UserSchema.methods.checkPassword = async function (password: string) {
    const result = await bcrypt.compare(password, this.hashedPassword);
    return result;
};

UserSchema.statics.findByUsername = function (username: string) {
    return this.findOne({ username });
};


UserSchema.methods.generateJWT = function () {
    const today = new Date();
    const expirationDate = new Date(today);
    expirationDate.setDate(today.getDate() + 30);

    return jwt.sign({
        email: this.email,
        id: this._id,
        exp: parseInt((expirationDate.getTime() / 1000).toString(), 10),
    }, 'secret');
}

UserSchema.methods.toAuthJSON = function () {
    return {
        _id: this._id,
        name: this.name,
        username: this.username,
        email: this.email,
        token: this.generateJWT(),
    };
};

const User = mongoose.model<IUserDocument, IUserModel>("User", UserSchema);
export default User;
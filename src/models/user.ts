import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { ApiError } from "../error/error.handler";

//initial file .env
dotenv.config();
//create user type
export interface IUser {
  _id: mongoose.Types.ObjectId;
  username: string;
  password: string;
  phone_number: string;
  role: string;
  event: boolean;
  camera: boolean;
  report: boolean;
  configuration: boolean;
  views: boolean;
  created_date: Date;
}

interface IUserDocument extends IUser, Document {
  _id: mongoose.Types.ObjectId;
  setPassword: (password: string, username: string) => string;
  checkPassword: (password: string, done: Function) => Promise<boolean>;
  generateJWT: (is_remember: boolean) => any;
  toAuthJSON: (is_remember: boolean) => any;
}

interface IUserModel extends Model<IUserDocument> {
  checkPassword: (password: string, done: Function) => Promise<boolean>;
  setPassword: (password: string, username: string) => string;
  generateJWT: (is_remember: boolean) => any;
  toAuthJSON: (is_remember: boolean) => any;
}

//create user model with schema for save in DB
const UserSchema: Schema<IUserDocument> = new Schema(
  {
    username: { type: String, required: true },
    password: { type: String, required: true },
    phone_number: { type: String, required: true },
    event: { type: Boolean, default: false },
    camera: { type: Boolean, default: false },
    report: { type: Boolean, default: false },
    configuration: { type: Boolean, default: false },
    role: { type: String, required: true },
    created_date: { type: Date, default: Date.now },
  },
  {
    collection: "User",
  }
);

//for encrypt password
const SALT_FACTOR = 10;
UserSchema.pre("save", function (done: Function) {
  var user = this;
  if (!user.isModified("password")) {
    return done();
  }
  bcrypt.genSalt(SALT_FACTOR, function (err, salt) {
    if (err) {
      return done(err);
    }
    bcrypt.hash(
      user.password + user.username,
      salt,
      function (err, hashedPassword) {
        if (err) {
          return done(err);
        }
        user.password = hashedPassword;
        done();
      }
    );
  });
});

//compare password
UserSchema.methods.checkPassword = async function (
  password: string,
  done: Function
) {
  try {
    let user = this;
    let isMatch = await bcrypt.compare(password + user.username, user.password);
    return done(null, isMatch);
  } catch (err) {
    return done(err);
  }
};

export async function setPassword(password: string, username: string) {
  let salt = await bcrypt.genSalt(SALT_FACTOR);
  let result = await bcrypt.hash(password + username, salt);
  return result
}

//get secrect key jwt token
const secret = process.env["JWT_SECRET"] as string;

//generate jwt token
UserSchema.methods.generateJWT = function (is_remember: boolean) {
  const today = new Date();
  const expirationDate = new Date(today);
  let exp_time =
    is_remember == true ? today.getHours() + 8 : today.getMinutes() + 15;
  if (is_remember == true) {
    expirationDate.setHours(exp_time);
  } else {
    expirationDate.setMinutes(exp_time);
  }

  return jwt.sign(
    {
      id: this._id,
      email: this.email,
      role: this.role,
      remember: is_remember,
      exp: parseInt((expirationDate.getTime() / 1000).toString(), 10),
    },
    secret
  );
};

//get user data jason for register
UserSchema.methods.toJSON = function () {
  return {
    _id: this._id,
    name: this.name,
    username: this.username,
    phone_number: this.phone_number,
    email: this.email,
    role: this.role,
    event: this.event,
    camera: this.camera,
    report: this.report,
    configuration: this.configuration,
    create_date: this.created_date,
  };
};

//get user data jason for auth
UserSchema.methods.toAuthJSON = function (is_remember: boolean) {
  return {
    _id: this._id,
    name: this.name,
    username: this.username,
    phone_number: this.phone_number,
    email: this.email,
    role: this.role,
    event: this.event,
    camera: this.camera,
    report: this.report,
    configuration: this.configuration,
    create_date: this.created_date,
    token: this.generateJWT(is_remember),
  };
};

// Compile model from schema
const User = mongoose.model<IUserDocument, IUserModel>("User", UserSchema);
export default User;

import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcrypt";
import { Request } from "express";

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
  camera_access?: Array<mongoose.Types.ObjectId>;
}

interface IUserDocument extends IUser, Document {
  _id: mongoose.Types.ObjectId;
  setPassword: (password: string, username: string) => string;
  checkPassword: (password: string) => Promise<boolean>;
  generateAuthSession: (is_remember: boolean) => any;
  toAuthJSON: (is_remember: boolean) => any;
}

interface IUserModel extends Model<IUserDocument> {
  checkPassword: (password: string) => Promise<boolean>;
  setPassword: (password: string, username: string) => string;
  generateAuthSession: (is_remember: boolean) => any;
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
    camera_access: { type: Array<mongoose.Types.ObjectId>, ref: "Camera", default: [] }
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
UserSchema.methods.checkPassword = async function (password: string) {
  let user = this;
  return await bcrypt.compare(password + user.username, user.password);
};

export async function setPassword(password: string, username: string) {
  let salt = await bcrypt.genSalt(SALT_FACTOR);
  let result = await bcrypt.hash(password + username, salt);
  return result
}

//generate jwt token
UserSchema.methods.generateAuthSession = function (req: Request) {
  const is_remember = req.body["is_remember"] ?? false; // defaulted to false
  const maxAge = is_remember ? 8 * 60 * 60 * 1000 : 15 * 60 * 1000;
  //             if remeber     8 hours       else    15 minutes
  req.session.cookie.maxAge = maxAge;
  req.session.user = this;
  console.log(__dirname, "/", __filename, " -> user", this);

  // {
  //   id: this._id,
  //   email: this.email,
  //   role: this.role,
  // }
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
    camera_access: this.camera_access,
  };
};

//get user data jason for auth
UserSchema.methods.toAuthJSON = function (is_remember: boolean) {
  // this.generateAuthSession(is_remember);
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
    camera_access: this.camera_access,
  };
};

// Compile model from schema
const User = mongoose.model<IUserDocument, IUserModel>("User", UserSchema);
export default User;

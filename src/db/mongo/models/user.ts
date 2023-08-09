import mongoose, { Schema, Document, Model } from "mongoose";
import { genSaltSync, compareSync, hashSync } from "bcrypt";
import { Request } from "express";
import { IUserDocument, IUserModel } from "../../../types/interfaces/user.interface";

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

//compare password
UserSchema.methods.checkPassword = function (password: string) {
  let user = this;
  return compareSync(password + user.username, user.password);
};

export function setPassword(password: string, username: string) {
  const salt = genSaltSync(SALT_FACTOR);
  const result = hashSync(password + username, salt);
  return result
};

//for encrypt password
const SALT_FACTOR = 10;
UserSchema.pre("save", function (done: Function) {
  try {
    const user = this;
    if (!user.isModified("password")) return done();
    user.password = user.setPassword(user.password, user.username);
    done();
  } catch (err) {
    done(err);
  };
});
// Compile model from schema
const User = mongoose.model<IUserDocument, IUserModel>("User", UserSchema);
export default User;

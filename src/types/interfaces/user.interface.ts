import mongoose, { Document, Model } from "mongoose";

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
};

export interface IUserDocument extends IUser, Document {
  _id: mongoose.Types.ObjectId;
  setPassword: (password: string, username: string) => string;
  checkPassword: (password: string) => Promise<boolean>;
  generateAuthSession: (is_remember: boolean) => any;
  toAuthJSON: (is_remember: boolean) => any;
};

export interface IUserModel extends Model<IUserDocument> {
  setPassword: (password: string, username: string) => string;
  checkPassword: (password: string) => Promise<boolean>;
  generateAuthSession: (is_remember: boolean) => any;
  toAuthJSON: (is_remember: boolean) => any;
};

import mongoose from "mongoose";

//define department type
export interface IDepartment extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  created_date: Date;
};


export interface IChildrenCamera {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  url: string;
  username: string;
  password: string;
  ip: string;
  is_enabled: boolean;
};

export interface IChildrenSection {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  children: IChildrenCamera[];
};

export interface IResponseJson {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  children: IChildrenSection[];
};
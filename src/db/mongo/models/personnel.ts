import mongoose, { Schema } from "mongoose";
import path from "path";
import { IPersonnel } from "../../../types/interfaces/personnel.interface";
import PersonImage from "./personImage";
import Car from "./car";
import fs from 'fs-extra';
import { randomUuid } from "../../../tools/utils.tools";

//create personnel model with schema for save in DB
const PersonnelSchema: Schema<IPersonnel> = new Schema(
  {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    person_type: {
      type: String,
      enum: ['normal', 'guest', 'hostile'],
      default: 'normal',
      validate: {
        validator: (v: string) => ['normal', 'guest', 'hostile'].includes(v),
        message: '{VALUE} is not a valid person type'
      }
    },
    national_code: { type: String, default: "" }, // () => randomUuid(10, "number").toString()
    email: { type: String, default: "test@gmail.com" },
    phone_number: { type: String, default: "" },
    job_id: { type: Schema.Types.ObjectId, ref: "JobTitle", default: undefined },
    personnel_code: { type: String, default: "" }, // () => randomUuid(10, "number").toString()
    camera_whitelist: { type: [Schema.Types.ObjectId], ref: "Camera", default: [] },
    allowed_pass: { type: Schema.Types.Mixed, default: undefined },
    alert: { type: Boolean, default: false },
    tracked: { type: Boolean, default: false },
    create_date: { type: Date, default: Date.now },
  },
  {
    collection: "Personnel",
  }
);

//get personnel data jason for auth
PersonnelSchema.methods.toName = function () {
  return this.first_name + " " + this.last_name;
}
//get personnel data jason for auth
PersonnelSchema.methods.toJSON = function () {
  //get url AI for send request
  const BASE_URL: string = process.env["BASE_URL"] as string;
  //define path for save image
  let pathSave = path.join(__dirname, `./../../../../assets/image/${this._id}/avatar.jpeg`);
  let have_avatar: Boolean = false;
  //if path not exist, create path
  if (fs.existsSync(pathSave)) {
    have_avatar = true;
  }

  return {
    _id: this._id,
    first_name: this.first_name,
    last_name: this.last_name,
    national_code: this.national_code,
    email: this.email,
    phone_number: this.phone_number,
    job_id: this.job_id,
    personnel_code: this.personnel_code,
    camera_whitelist: this.camera_whitelist,
    image_id: this.image_id,
    create_date: this.create_date,
    tracked: this.tracked,
    allowed_pass: this.allowed_pass,
    alert: this.alert,
    image_url: have_avatar === true ? BASE_URL + "/config/user/files/download/" + this._id : BASE_URL + "/config/user/files/download/default"
  };
};



PersonnelSchema.post(["remove", "deleteOne", "deleteMany", "findOneAndDelete", "findOneAndRemove"], async (doc: (IPersonnel & Required<{ _id: Schema.Types.ObjectId; }>)) => {
  let images = await PersonImage.find({ person_id: doc._id }).exec();
  for (const image of images) {
    // try {
    //   const vector = image.vector;
    //   const vectorFilePath = `../../assets/image/${doc.id}/${doc.id}-${image.hash_id}.jpeg`;
    //   fs.writeFile(vectorFilePath, JSON.stringify(vector));
    // if (!!image.masked_embd) {
    //   const masked_embd = image.masked_embd;
    //   const maskedFilePath = `../../../assets/image/${doc.first_name}_${doc.last_name}_${image.masked_face_id}.txt`;
    //   fs.writeFile(maskedFilePath, JSON.stringify(masked_embd));
    // };
    // } catch (_) { }
    await image.delete();
  };
  await PersonImage.deleteMany({ person_id: doc._id }).exec(); // to ensure
  await Car.deleteMany({ owner: doc._id }).exec();
});







// Compile model from schema
const Personnel = mongoose.model("Personnel", PersonnelSchema);
export default Personnel;

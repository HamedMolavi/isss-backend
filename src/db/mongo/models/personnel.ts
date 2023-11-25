import mongoose, { Schema } from "mongoose";
import path from "path";
import { IPersonnel } from "../../../types/interfaces/personnel.interface";
import PersonImage from "./personImage";
import Car from "./car";
import fs from 'fs-extra';

//create personnel model with schema for save in DB
const PersonnelSchema: Schema<IPersonnel> = new Schema(
  {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    national_code: { type: String, required: true },
    email: { type: String, default: "" },
    phone_number: { type: String, required: true },
    job_id: { type: Schema.Types.ObjectId, ref: "JobTitle", default: undefined },//TODO: default to feed
    personnel_code: { type: String, required: false },
    section_id: { type: Schema.Types.ObjectId, ref: "Section", default: undefined },//TODO: default to feed
    camera_whitelist: { type: [Schema.Types.ObjectId] },
    is_active: { type: Boolean, default: false },
    is_employee: { type: Boolean, default: false },
    is_dismissed: { type: Boolean, default: false },
    tracked: { type: Boolean, default: false },
    create_date: { type: Date, default: Date.now },
  },
  {
    collection: "Personnel",
  }
);


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
    section_id: this.section_id,
    camera_whitelist: this.camera_whitelist,
    image_id: this.image_id,
    is_active: this.is_active,
    is_employee: this.is_employee,
    is_dismissed: this.is_dismissed,
    create_date: this.create_date,
    tracked: this.tracked,
    image_url: have_avatar === true ? BASE_URL + "/config/user/files/download/" + this._id : BASE_URL + "/config/user/files/download/default"
  };
};



PersonnelSchema.post(["remove", "deleteOne", "deleteMany","findOneAndDelete","findOneAndRemove"], async (doc: (IPersonnel & Required<{ _id: Schema.Types.ObjectId; }>)) => {
  let images = await PersonImage.find({ person_id: doc._id }).exec();
  for (const image of images) {
    const vector = image.vector;
    const vectorFilePath = `../../../assets/backupImages/${doc.first_name}_${doc.last_name}_${image.hash_id}.txt`;
    fs.writeFile(vectorFilePath, JSON.stringify(vector));
    if (!!image.masked_embd) {
      const masked_embd = image.masked_embd;
      const maskedFilePath = `../../../assets/backupImages/${doc.first_name}_${doc.last_name}_${image.masked_face_id}.txt`;
      fs.writeFile(maskedFilePath, JSON.stringify(masked_embd));
    };
    await image.delete();
  };
  await PersonImage.deleteMany({ person_id: doc._id }).exec(); // to ensure
  await Car.deleteMany({ owner: doc._id }).exec();
});







// Compile model from schema
const Personnel = mongoose.model("Personnel", PersonnelSchema);
export default Personnel;

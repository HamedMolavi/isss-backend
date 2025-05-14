import mongoose, { Schema } from "mongoose";
import path from "path";
import { IPersonnel } from "../../../types/interfaces/personnel.interface";
import PersonImage from "./personImage";
import Car from "./car";
import fs from "fs-extra";
import Product from "./product";

const person_types = [
  "normal",
  "guest",
  "hostile",
  "client_buyer",
  "client_seller",
];
//create personnel model with schema for save in DB
const PersonnelSchema: Schema<IPersonnel> = new Schema(
  {
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    person_type: {
      type: String,
      enum: person_types,
      default: "normal",
      validate: {
        validator: (v: string) => person_types.includes(v),
        message: "{VALUE} is not a valid person type",
      },
    },
    national_code: { type: String, default: "" }, // () => randomUuid(10, "number").toString()
    email: { type: String, default: "test@gmail.com" },
    phone_number: { type: String, default: "" },
    job_id: {
      type: Schema.Types.ObjectId,
      ref: "JobTitle",
      default: undefined,
    },
    personnel_code: { type: String, default: "" }, // () => randomUuid(10, "number").toString()
    camera_whitelist: {
      type: [Schema.Types.ObjectId],
      ref: "Camera",
      default: [],
    },
    section_whitelist: {
      type: [Schema.Types.ObjectId],
      ref: "Section",
      default: [],
    },
    schedule_whitelist: {
      type: [Schema.Types.ObjectId],
      ref: "Schedule",
      default: [],
    },
    department_whitelist: {
      type: [Schema.Types.ObjectId],
      ref: "Department",
      default: [],
    },
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
};
//get personnel data jason for auth
PersonnelSchema.methods.toJSON = async function () {
  //get url AI for send request
  const BASE_URL: string = process.env["BASE_URL"] as string;
  //define path for save image
  let pathSave = path.join(
    __dirname,
    `./../../../../assets/image/${this._id}/avatar.jpeg`
  );
  let have_avatar: Boolean = false;
  //if path not exist, create path
  if (fs.existsSync(pathSave)) {
    have_avatar = true;
  }

  let avatar = "data:image/jpeg;base64,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";
  try {
    const personImage = await PersonImage.findOne({ person_id: this._id });
    let pathSave = path.join(
      __dirname,
      `./../../../../assets/image/${this._id}/${personImage?.person_id}-${personImage?.hash_id}`
    );

    // Add base64 conversion
    if (fs.existsSync(`${pathSave}.jpeg`)) {
      const imageBuffer = fs.readFileSync(`${pathSave}.jpeg`);
      avatar = `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
    }
  } catch (error) {
    console.error(`Error finding vector data for user ${this._id}:`, error);
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
    image_url:
      have_avatar === true
        ? BASE_URL + "/config/user/files/download/" + this._id
        : BASE_URL + "/config/user/files/download/default",
    avatar,
  };
};

PersonnelSchema.post(
  ["remove", "deleteOne", "deleteMany", "findOneAndDelete", "findOneAndRemove"],
  async (doc: IPersonnel & Required<{ _id: Schema.Types.ObjectId }>) => {
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
    }
    await PersonImage.deleteMany({ person_id: doc._id }).exec(); // to ensure
    await Car.deleteMany({ owner: doc._id }).exec();
    let products = await Product.find({ person_id: doc._id }).exec();
    for (const product of products) await product.delete();
    await Product.deleteMany({ person_id: doc._id }).exec(); // to ensure
  }
);

// Compile model from schema
const Personnel = mongoose.model('Personnel', PersonnelSchema);
export default Personnel;

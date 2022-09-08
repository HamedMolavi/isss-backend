"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const path_1 = __importDefault(require("path"));
//create personnel model with schema for save in DB
const PersonnelSchema = new mongoose_1.Schema({
    first_name: { type: String, required: true },
    last_name: { type: String, required: true },
    national_code: { type: String, required: true },
    email: { type: String, required: true },
    phone_number: { type: String, required: true },
    job_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "JobTitle", required: true },
    personnel_code: { type: String, required: true },
    section_id: { type: mongoose_1.Schema.Types.ObjectId, ref: "Section", required: true },
    camera_whitelist: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Camera" }],
    image_id: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    is_active: { type: Boolean, default: false },
    is_employee: { type: Boolean, default: false },
    is_dismissed: { type: Boolean, default: false },
    create_date: { type: Date, default: Date.now },
}, {
    collection: "Personnel",
});
//get personnel data jason for auth
PersonnelSchema.methods.toJSON = function () {
    //define path for save image
    let pathSave = path_1.default.join(__dirname, `./../../assets/image/${this.personnel_code}`);
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
        image_url: "192.168.1.39:8000/api/v1/files/download/default",
        //image_url: pathSave != null ? pathSave + this.personnel_code + "/" + "avatar.jpg" : "192.168.1.39:8000/api/v1/files/download/default",
    };
};
// Compile model from schema
const Personnel = mongoose_1.default.model("Personnel", PersonnelSchema);
exports.default = Personnel;

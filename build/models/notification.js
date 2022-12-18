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
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
//create Notification model with schema for save in DB
const NotificationSchema = new mongoose_1.Schema({
    create_date: { type: Date, default: Date.now },
    cameras: { type: [mongoose_1.Schema.Types.ObjectId], ref: "Camera", required: false },
    types: { type: [mongoose_1.Schema.Types.ObjectId], ref: "Model", required: false },
    time_start: { type: String, required: false, default: "00:00" },
    time_end: { type: String, required: false, default: "00:00" },
    bypass_time: { type: Boolean, required: false },
    has_video: { type: Boolean, required: false },
    enable: { type: Boolean, required: false },
    phone_number: { type: String, required: false, default: "" },
    email: { type: String, required: false, default: "" },
    sms_enable: { type: Boolean, required: false, default: false },
    email_enable: { type: Boolean, required: false, default: false },
}, {
    collection: "Notification",
});
// Compile model from schema
const Notification = mongoose_1.default.model("Notification", NotificationSchema);
exports.default = Notification;

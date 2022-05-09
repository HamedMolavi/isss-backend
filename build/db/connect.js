"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
// Connect to the database
function connect() {
    //find the url to connect to the database
    const dbUri = process.env["MONGODB_URL"];
    //connect to the database
    return mongoose_1.default
        .connect(dbUri)
        .then(() => {
        console.info("Database connected");
        mongoose_1.default.set('debug', true);
    })
        .catch((error) => {
        console.error("db error", error);
        process.exit(1);
    });
}
exports.default = connect;

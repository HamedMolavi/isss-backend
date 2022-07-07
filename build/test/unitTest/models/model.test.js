"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connectMongo_1 = require("./../../../db/connectMongo");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("./../../../server");
//test  models model
describe("model", function () {
    let Model;
    //connect to DB before test
    before(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once("connected", () => {
            mongoose_1.default.connection.db
                .dropDatabase()
                .then(() => {
                require("./../../../models/model").registerModels;
                // This is the right model because register Models set it up for us.
                Model = mongoose_1.default.model("Model");
                done();
            })
                .catch((err) => {
                done(err);
            });
        });
    });
    //disconnect from DB after test
    after(function (done) {
        (0, connectMongo_1.Disconnect)();
        done();
    });
    //test model
    describe("register model", function () {
        //create model model
        it("should save model in db", function (done) {
            var model = new Model({
                name: "yolov5s",
                category: "fire",
                uri: "/home/mohsen/PycharmProjects/HD/HumanDetectionPackage/FirePredictor/Models/FD_yolov5s.onnx",
            });
            //test this model
            model
                .save()
                .then(() => {
                (0, chai_1.expect)(model.name).to.equal("yolov5s");
                (0, chai_1.expect)(model.category).to.equal("fire");
                (0, chai_1.expect)(model.uri).to.equal("/home/mohsen/PycharmProjects/HD/HumanDetectionPackage/FirePredictor/Models/FD_yolov5s.onnx");
                done();
            })
                .catch((err) => {
                done(err);
            });
        });
    });
});

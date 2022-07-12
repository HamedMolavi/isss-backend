"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const model_1 = __importDefault(require("../../models/model"));
const mongoose_1 = __importDefault(require("mongoose"));
const token = process.env.sample_token;
let _model;
//create testing for get model
describe("server run and get model", function () {
    //seve new models before test and get it
    before(function (done) {
        let model = new model_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628dcf2df014bc89f0280c62"),
            name: "googlenet",
            category: "fire",
            uri: "/home/mohsen/PycharmProjects/FireDetectionPackage/models/fire_exception.onnx",
        });
        model.save();
        done();
    });
    //delete model after test
    after(function (done) {
        model_1.default.deleteOne({ category: "fire" }).exec();
        done();
    });
    //test route for get model by id from DB
    it("should send back a JSON object for get model with category", function (done) {
        //test route for get model in DB
        (0, supertest_1.default)(server_1.default)
            .get("/api/v1/models/fire")
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.model;
            (0, chai_1.expect)(userResponse.category).to.equal("fire");
            (0, chai_1.expect)(userResponse.name).to.equal("googlenet");
            (0, chai_1.expect)(userResponse.uri).to.equal("/home/mohsen/PycharmProjects/FireDetectionPackage/models/fire_exception.onnx");
            // Done
            done();
        });
    });
    //test route for get all models from DB
    it("should send back a JSON object for get all models", function (done) {
        //test route for get personnel in DB
        (0, supertest_1.default)(server_1.default)
            .get("/api/v1/models?page=1&perPage=3")
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.models;
            (0, chai_1.expect)(res.body.message).to.equal("Success");
            (0, chai_1.expect)(userResponse[0]).to.have.property("category");
            (0, chai_1.expect)(userResponse[0]).to.have.property("name");
            (0, chai_1.expect)(userResponse[0]).to.have.property("uri");
            // Done
            done();
        });
    });
});

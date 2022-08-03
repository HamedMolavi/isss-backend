"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const department_1 = __importDefault(require("../../models/department"));
const camera_1 = __importDefault(require("../../models/camera"));
const mongoose_1 = __importDefault(require("mongoose"));
const section_1 = __importDefault(require("../../models/section"));
const token = process.env.sample_token;
//create testing get all departement file
describe("server run and api departement files", function () {
    before(function (done) {
        let camera1 = new camera_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628dc14af014bc89f0280c46"),
            section_id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c41"),
            name: "eng",
            url: "rtsp://{username}:{password}@{ip}:554/media/video2",
            username: "admin",
            password: "Admin12345!",
            ip: "172.10.10.224",
            is_enabled: true,
        });
        let camera2 = new camera_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628dc289f014bc89f0280c48"),
            section_id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c41"),
            name: "area2",
            url: "rtsp://{username}:{password}@{ip}:554/media/video2",
            username: "admin",
            password: "Admin12345!",
            ip: "172.10.10.240",
            is_enabled: true,
        });
        let camera3 = new camera_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628dc28ef014bc89f0280c4a"),
            section_id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c41"),
            name: "ai",
            url: "rtsp://{username}:{password}@{ip}:554/media/video2",
            username: "admin",
            password: "Admin12345!",
            ip: "172.10.10.245",
            is_enabled: true,
        });
        let camera4 = new camera_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628dc2abf014bc89f0280c4c"),
            section_id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c41"),
            name: "door_car",
            url: "rtsp://{username}:{password}@{ip}:554/media/video2",
            username: "admin",
            password: "Admin12345!",
            ip: "172.10.10.236",
            is_enabled: true,
        });
        let camera5 = new camera_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628dc2c0f014bc89f0280c4e"),
            section_id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c41"),
            name: "door_human",
            url: "rtsp://{username}:{password}@{ip}:554/media/video2",
            username: "admin",
            password: "Admin12345!",
            ip: "172.10.10.238",
            is_enabled: true,
        });
        let camera6 = new camera_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628dc2e7f014bc89f0280c52"),
            section_id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c40"),
            name: "edari",
            url: "rtsp://{username}:{password}@{ip}:554/media/video2",
            username: "admin",
            password: "Admin12345!",
            ip: "172.10.10.223",
            is_enabled: true,
        });
        let camera7 = new camera_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628dc31bf014bc89f0280c54"),
            section_id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c40"),
            name: "elec_kar",
            url: "rtsp://{username}:{password}@{ip}:554/media/video2",
            username: "admin",
            password: "Admin12345!",
            ip: "172.10.10.234",
            is_enabled: true,
        });
        let section1 = new section_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c41"),
            name: "AI",
            department_id: new mongoose_1.default.Types.ObjectId("628db754f014bc89f0280c3e"),
        });
        let department = new department_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628db754f014bc89f0280c3e"),
            name: "ENG",
        });
        camera1.save();
        camera2.save();
        camera3.save();
        camera4.save();
        camera5.save();
        camera6.save();
        camera7.save();
        section1.save();
        department.save();
        done();
    });
    // //delete model , camera , section , department after test
    after(function (done) {
        camera_1.default.deleteOne({ name: "eng" }).exec();
        camera_1.default.deleteOne({ name: "door_car" }).exec();
        camera_1.default.deleteOne({ name: "door_human" }).exec();
        camera_1.default.deleteOne({ name: "area2" }).exec();
        camera_1.default.deleteOne({ name: "ai" }).exec();
        camera_1.default.deleteOne({ name: "edari" }).exec();
        camera_1.default.deleteOne({ name: "elec_kar" }).exec();
        section_1.default.deleteMany().exec();
        department_1.default.deleteOne({ name: "ENG" }).exec();
        done();
    });
    //test route for get all departements file from DB
    it("should send back a JSON object for get all departement file", function (done) {
        //test route for get camera in DB
        (0, supertest_1.default)(server_1.default)
            .get("/api/v1/departementfiles")
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.data[0];
            (0, chai_1.expect)(res.body).to.have.property("total");
            (0, chai_1.expect)(res.body).to.have.property("data");
            (0, chai_1.expect)(userResponse._id.toString()).to.equal("628db754f014bc89f0280c3e");
            (0, chai_1.expect)(userResponse.name).to.equal("ENG");
            (0, chai_1.expect)(userResponse.type).to.equal("department");
            (0, chai_1.expect)(userResponse.children[0]._id.toString()).to.equal("628db904f014bc89f0280c41");
            (0, chai_1.expect)(userResponse.children[0].name).to.equal("AI");
            (0, chai_1.expect)(userResponse.children[0].type).to.equal("section");
            (0, chai_1.expect)(userResponse.children[0].children[0]._id.toString()).to.equal("628dc14af014bc89f0280c46");
            (0, chai_1.expect)(userResponse.children[0].children[0].name).to.equal("eng");
            (0, chai_1.expect)(userResponse.children[0].children[0].type).to.equal("camera");
            (0, chai_1.expect)(userResponse.children[0].children[0].url).to.equal("rtsp://{username}:{password}@{ip}:554/media/video2");
            (0, chai_1.expect)(userResponse.children[0].children[0].username).to.equal("admin");
            (0, chai_1.expect)(userResponse.children[0].children[0].password).to.equal("Admin12345!");
            (0, chai_1.expect)(userResponse.children[0].children[0].ip).to.equal("172.10.10.224");
            (0, chai_1.expect)(userResponse.children[0].children[0].is_enabled).to.equal(true);
            (0, chai_1.expect)(userResponse.children[0].children[1]._id).to.equal("628dc289f014bc89f0280c48");
            (0, chai_1.expect)(userResponse.children[0].children[1].name).to.equal("area2");
            (0, chai_1.expect)(userResponse.children[0].children[1].type).to.equal("camera");
            (0, chai_1.expect)(userResponse.children[0].children[1].url).to.equal("rtsp://{username}:{password}@{ip}:554/media/video2");
            (0, chai_1.expect)(userResponse.children[0].children[1].username).to.equal("admin");
            (0, chai_1.expect)(userResponse.children[0].children[1].password).to.equal("Admin12345!");
            (0, chai_1.expect)(userResponse.children[0].children[1].ip).to.equal("172.10.10.240");
            (0, chai_1.expect)(userResponse.children[0].children[1].is_enabled).to.equal(true);
            // Done
            done();
        });
    });
});

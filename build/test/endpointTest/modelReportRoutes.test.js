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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const camera_1 = __importDefault(require("../../models/camera"));
const mongoose_1 = __importStar(require("mongoose"));
const section_1 = __importDefault(require("../../models/section"));
const departement_1 = __importDefault(require("../../models/departement"));
const personnel_1 = __importDefault(require("../../models/personnel"));
const carBrand_1 = __importDefault(require("../../models/carBrand"));
const carColor_1 = __importDefault(require("../../models/carColor"));
const token = process.env.sample_token;
describe("server run and get report logs", function () {
    return __awaiter(this, void 0, void 0, function* () {
        yield this.before(function (done) {
            return __awaiter(this, void 0, void 0, function* () {
                let camera1 = new camera_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("628dc14af014bc89f0280c46"),
                    section_id: new mongoose_1.default.Types.ObjectId("628db754f014bc89f0280c3e"),
                    name: "mali",
                    url: "rtsp://{username}:{password}@{ip}:554/media/video2",
                    username: "admin",
                    password: "Admin12345!",
                    ip: "172.10.10.224",
                    is_enabled: true,
                });
                let camera2 = new camera_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("628dc332f014bc89f0280c56"),
                    section_id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c40"),
                    name: "eng_door",
                    url: "rtsp://{username}:{password}@{ip}:554/media/video2",
                    username: "admin",
                    password: "Admin12345!",
                    ip: "172.10.10.221",
                    is_enabled: true,
                });
                let camera3 = new camera_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("628dc332f014bc89f0280c56"),
                    section_id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c40"),
                    name: "eng_door",
                    url: "rtsp://{username}:{password}@{ip}:554/media/video2",
                    username: "admin",
                    password: "Admin12345!",
                    ip: "172.10.10.221",
                    is_enabled: true,
                });
                let model = new mongoose_1.Model({
                    _id: new mongoose_1.default.Types.ObjectId("628dcf60f014bc89f0280c64"),
                    name: "yolov5",
                    category: "human",
                    uri: "/home/mohsen/PycharmProjects/FireDetectionPackage/models/YOLOv5m_CrowdHuman.onnx",
                });
                let section = new section_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c41"),
                    name: "AI",
                    Department: new mongoose_1.default.Types.ObjectId("628db754f014bc89f0280c3e"),
                });
                let department = new departement_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("628db754f014bc89f0280c3e"),
                    name: "ENG",
                });
                let personnel1 = new personnel_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("628df9fbf014bc89f0280c7a"),
                    first_name: "Mohsen",
                    last_name: "Fatehifar",
                });
                let personnel2 = new personnel_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("628dfa6ff014bc89f0280c84"),
                    first_name: "Javad",
                    last_name: "Zamani",
                });
                let personnel3 = new personnel_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("628dfa4df014bc89f0280c80"),
                    first_name: "Zeinab",
                    last_name: "Mousavian",
                });
                let carBrand1 = new carBrand_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("62943e1c2008add06c796aa3"),
                    name: "lexus",
                });
                let carBrand2 = new carBrand_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("62943e1c2008add06c796aa8"),
                    name: "pars",
                });
                let carBrand3 = new carBrand_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("62943e1c2008add06c796aa7"),
                    name: "dena",
                });
                let carColor1 = new carColor_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("62935b82b465fdf3f2b8084f"),
                    name: "white",
                });
                let carColor2 = new carColor_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("62935b82b465fdf3f2b8084e"),
                    name: "black",
                });
                let carColor3 = new carColor_1.default({
                    _id: new mongoose_1.default.Types.ObjectId("62935b82b465fdf3f2b8084d"),
                    name: "yellow",
                });
                yield camera1.save();
                yield camera2.save();
                yield camera3.save();
                yield model.save();
                yield section.save();
                yield department.save();
                yield personnel1.save();
                yield personnel2.save();
                yield personnel3.save();
                yield carBrand1.save();
                yield carBrand2.save();
                yield carBrand3.save();
                yield carColor1.save();
                yield carColor2.save();
                yield carColor3.save();
                done();
            });
        });
        //delete model , camera , section , department after test
        // this.afterAll(function (done) {
        //   Model.deleteOne({ category: "human" }).exec();
        //   Camera.deleteOne({ name: "mali" }).exec();
        //   Section.deleteOne({ name: "AI" }).exec();
        //   Departement.deleteOne({ name: "ENG" }).exec();
        //   done();
        // });
        //test get sabotage report sabotage logs with token
        it("should send back a JSON object with all sabotage log report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/sabotage?perPage=10&page=1")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                done();
            });
        });
        //test search sabotage report sabotage logs with token
        it("should send back a JSON object search sabotage log report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/sabotage?perPage=300&page=1&search=yes")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .send({
                time_start: "05:30",
                time_end: "12:30",
                date_start: "04/15/2021",
                date_end: "04/15/2023",
                cameras: ["628dc14af014bc89f0280c46", "628dc332f014bc89f0280c56"],
            })
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                done();
            });
        });
        //test get fire report fire logs with token
        it("should send back a JSON object with all fire log report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/fire?perPage=200&page=1")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                // expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("probability");
                done();
            });
        });
        //test search fire  logs with token
        it("should send back a JSON object search fire log report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/fire?perPage=10&page=1&search=yes")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .send({
                time_start: "05:30",
                time_end: "12:30",
                date_start: "4/15/2021",
                date_end: "4/15/2023",
                probability: 0.5,
                cameras: ["628dc31bf014bc89f0280c54", "628dc2cff014bc89f0280c50"],
            })
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                console.log(response);
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //  expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                (0, chai_1.expect)(response.data[0]).to.have.property("probability");
                done();
            });
        });
        //test get  all face logs with token
        it("should send back a JSON object with all face log report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/face?perPage=10&page=1")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                // expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                //   expect(response.data[0]).to.have.property('fullName');
                //  expect(response.data[0]).to.have.property('Allowed');
                done();
            });
        });
        //test get fire report face logs with token
        it("should send back a JSON object search face log report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/face?perPage=3&page=1&search=yes")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .send({
                time_start: "05:30",
                time_end: "05:30",
                date_start: "4/15/2021",
                date_end: "4/15/2023",
                cameras: ["628dc2c0f014bc89f0280c4e", "628dc332f014bc89f0280c56"],
            })
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //  expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                //  expect(response.data[0]).to.have.property('fullName');
                //  expect(response.data[0]).to.have.property('Allowed');
                done();
            });
        });
        //test get all report people counting logs with token
        it("should send back a JSON object all people counting log report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/human?perPage=3&page=1")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //   expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                (0, chai_1.expect)(response.data[0]).to.have.property("NumberOfPeople");
                done();
            });
        });
        //test get report people counting logs with token
        it("should send back a JSON object search people counting log report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/human?perPage=3&page=1&search=yes")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .send({
                time_start: "05:30",
                time_end: "12:30",
                date_start: "4/15/2021",
                date_end: "4/15/2023",
                cameras: ["628dc289f014bc89f0280c48"],
            })
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //   expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                (0, chai_1.expect)(response.data[0]).to.have.property("NumberOfPeople");
                done();
            });
        });
        //test get report all event logs with token
        it("should send back a JSON object all event log report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/event?perPage=10&page=1")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //   expect(response.da628dc14af014bc89f0280c46ta[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                (0, chai_1.expect)(response.data[0]).to.have.property("AI");
                (0, chai_1.expect)(response.data[0]).to.have.property("description");
                done();
            });
        });
        //test get report event logs search with camera_id with token
        it("should send back a JSON object search event log with camera_id report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/event?perPage=5&page=1&name=camera&search=628dc14af014bc89f0280c46")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //   expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                (0, chai_1.expect)(response.data[0]).to.have.property("AI");
                (0, chai_1.expect)(response.data[0]).to.have.property("description");
                done();
            });
        });
        //test get report event logs search with model name with token
        it("should send back a JSON object search event log with model name report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/event?perPage=50&page=1&name=ai&search=human")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //   expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                (0, chai_1.expect)(response.data[0]).to.have.property("AI");
                (0, chai_1.expect)(response.data[0]).to.have.property("description");
                done();
            });
        });
        //test get report event logs search with camera_id && model name with token
        it("should send back a JSON object search event log with camera_id && model name  report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/event?perPage=5&page=1&name=all&search=human+628dc14af014bc89f0280c46")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .send({
                time_start: "05:30",
                time_end: "12:30",
                date_start: "4/15/2021",
                date_end: "4/15/2023",
            })
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //   expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                (0, chai_1.expect)(response.data[0]).to.have.property("AI");
                (0, chai_1.expect)(response.data[0]).to.have.property("description");
                done();
            });
        });
        //test get report all department event with token
        it("should send back a JSON object all department event report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reportDepartmets?perPage=5&page=1&name=all&search=human+628dc14af014bc89f0280c46")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .send({
                time_start: "05:30",
                time_end: "12:30",
                date_start: "4/15/2021",
                date_end: "4/15/2023",
            })
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //   expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("sections");
                (0, chai_1.expect)(response.data[0]).to.have.property("AI");
                (0, chai_1.expect)(response.data[0]).to.have.property("description");
                done();
            });
        });
        //test get report department event search by camera_id with token
        it("should send back a JSON object department event report search by camera_id", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reportDepartmets?perPage=10&page=1&name=camera&search=628dc14af014bc89f0280c46")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //   expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("sections");
                (0, chai_1.expect)(response.data[0]).to.have.property("AI");
                (0, chai_1.expect)(response.data[0]).to.have.property("description");
                done();
            });
        });
        //test get report department event search by model name with token
        it("should send back a JSON object department event report search by model name", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reportDepartmets?perPage=10&page=1&name=ai&search=human")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //   expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("sections");
                (0, chai_1.expect)(response.data[0]).to.have.property("AI");
                (0, chai_1.expect)(response.data[0]).to.have.property("description");
                done();
            });
        });
        // //test get report  department event search by camera , model , time with token
        // it("should send back a JSON object  department event report search by camera , model , time", function (done) {
        //   request(app)
        //     .get(
        //       "/api/v1/reportDepartmets?perPage=10&page=1&name=all&search=human+628dc14af014bc89f0280c46"
        //     )
        //     .set("Content-Type", "application/json")
        //     .set("Authorization", `Bearer ${token}`)
        //     .send({
        //       time_start: "05:30",
        //       time_end: "12:30",
        //       date_start: "4/15/2021",
        //       date_end: "4/15/2023",
        //     })
        //     .expect("Content-Type", /json/)
        //     .expect(200, function (err, res) {
        //       if (err) {
        //         return done(err);
        //       }
        //       let response = res.body;
        //       expect(response.message).to.be.equal("Success");
        //       //   expect(response.data[0]).to.have.property('camera');
        //       expect(response.data[0]).to.have.property("time");
        //       expect(response.data[0]).to.have.property("sections");
        //       expect(response.data[0]).to.have.property("AI");
        //       expect(response.data[0]).to.have.property("description");
        //       done();
        //     });
        // }).timeout(20000);
        //test get plate log report plate logs with token
        it("should send back a JSON object with all plate log report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/plate?perPage=50&page=1")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //   expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0].camera_id.toString()).to.equal("628dc332f014bc89f0280c56");
                (0, chai_1.expect)(response.data[0].plate_number).to.equal("68U54419");
                (0, chai_1.expect)(response.data[0].owner).to.equal("Mohsen Fatehifar");
                (0, chai_1.expect)(response.data[0].color).to.equal("black");
                (0, chai_1.expect)(response.data[0].brand).to.equal("brand");
                (0, chai_1.expect)(response.data[1].camera_id.toString()).to.equal("628dc31bf014bc89f0280c54");
                (0, chai_1.expect)(response.data[1].plate_number).to.equal("44U78464");
                (0, chai_1.expect)(response.data[1].owner).to.equal("Javad Zamani");
                (0, chai_1.expect)(response.data[1].color).to.equal("white");
                (0, chai_1.expect)(response.data[1].brand).to.equal("pars");
                done();
            });
        }).timeout(10000);
        //test get plate log report search plate logs with token
        it("should send back a JSON object with search plate log report", function (done) {
            (0, supertest_1.default)(server_1.default)
                .post("/api/v1/reports/plate?perPage=3&page=1&search=yes")
                .set("Content-Type", "application/json")
                .set("Authorization", `Bearer ${token}`)
                .send({
                time_start: "05:30",
                time_end: "20:00",
                date_start: "04/15/2021",
                date_end: "04/15/2023",
                car_brand: ["62943e1c2008add06c796aa3"],
                car_color: ["62935b82b465fdf3f2b8084e"],
                owner: ["628df9bdf014bc89f0280c78"],
                cameras: ["628dc332f014bc89f0280c56"],
                allowed: false,
            })
                .expect("Content-Type", /json/)
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                let response = res.body;
                (0, chai_1.expect)(response.success).to.be.equal(true);
                //   expect(response.data[0]).to.have.property('camera');
                (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
                (0, chai_1.expect)(response.data[0]).to.have.property("time");
                (0, chai_1.expect)(response.data[0]).to.have.property("plate");
                (0, chai_1.expect)(response.data[0]).to.have.property("owner");
                (0, chai_1.expect)(response.data[0]).to.have.property("allowed");
                done();
            });
        }).timeout(10000);
    });
});

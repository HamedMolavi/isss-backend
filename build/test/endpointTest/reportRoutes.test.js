"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const camera_1 = __importDefault(require("../../models/camera"));
const model_1 = __importDefault(require("../../models/model"));
const section_1 = __importDefault(require("../../models/section"));
const department_1 = __importDefault(require("../../models/department"));
const personnel_1 = __importDefault(require("../../models/personnel"));
const carBrand_1 = __importDefault(require("../../models/carBrand"));
const carColor_1 = __importDefault(require("../../models/carColor"));
const mongoose_1 = __importDefault(require("mongoose"));
const car_1 = __importDefault(require("../../models/car"));
const token = process.env.sample_token;
describe("server run and get report logs", function () {
    before(function (done) {
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
        let model = new model_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628dcf60f014bc89f0280c64"),
            name: "yolov5",
            category: "human",
            uri: "/home/mohsen/PycharmProjects/FireDetectionPackage/models/YOLOv5m_CrowdHuman.onnx",
        });
        let section = new section_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c41"),
            name: "AI",
            department_id: new mongoose_1.default.Types.ObjectId("628db754f014bc89f0280c3e"),
        });
        let department = new department_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628db754f014bc89f0280c3e"),
            name: "ENG",
        });
        let personnel1 = new personnel_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628df9fbf014bc89f0280c7a"),
            first_name: "Mohsen",
            last_name: "Fatehifar",
            national_code: "123456789",
            email: "test@gmail.com",
            phone_number: "09121234567",
            job_id: new mongoose_1.default.Types.ObjectId("628df9fbf014bc89f0280c7a"),
            personnel_code: "123456789",
            section_id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c41"),
            camera_whitelist: [
                "628dc332f014bc89f0280c56",
                "628dc14af014bc89f0280c46",
            ],
            is_active: true,
            is_employee: true,
            is_dismissed: true,
            create_date: Date.now(),
        });
        let personnel2 = new personnel_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628dfa6ff014bc89f0280c84"),
            first_name: "Javad",
            last_name: "Zamani",
            national_code: "123456789",
            email: "test@gmail.com",
            phone_number: "09121234567",
            job_id: new mongoose_1.default.Types.ObjectId("628df9fbf014bc89f0280c7a"),
            personnel_code: "123456789",
            section_id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c41"),
            camera_whitelist: [
                "628dc332f014bc89f0280c56",
                "628dc14af014bc89f0280c46",
            ],
            is_active: true,
            is_employee: true,
            is_dismissed: true,
            create_date: Date.now(),
        });
        let personnel3 = new personnel_1.default({
            _id: new mongoose_1.default.Types.ObjectId("628dfa4df014bc89f0280c80"),
            first_name: "Zeinab",
            last_name: "Mousavian",
            national_code: "123456789",
            email: "test@gmail.com",
            phone_number: "09121234567",
            job_id: new mongoose_1.default.Types.ObjectId("628df9fbf014bc89f0280c7a"),
            personnel_code: "123456789",
            section_id: new mongoose_1.default.Types.ObjectId("628db904f014bc89f0280c41"),
            camera_whitelist: [
                "628dc332f014bc89f0280c56",
                "628dc14af014bc89f0280c46",
            ],
            is_active: true,
            is_employee: true,
            is_dismissed: true,
            create_date: Date.now(),
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
        let car1 = new car_1.default({
            _id: new mongoose_1.default.Types.ObjectId("6293643def1b3ac103e4cb14"),
            owner: new mongoose_1.default.Types.ObjectId("628df9fbf014bc89f0280c7a"),
            brand_id: new mongoose_1.default.Types.ObjectId("62943e1c2008add06c796aa3"),
            color_id: new mongoose_1.default.Types.ObjectId("62935b82b465fdf3f2b8084e"),
            number_plate: "68U54419",
            camera_whitelist: [],
        });
        let car2 = new car_1.default({
            _id: new mongoose_1.default.Types.ObjectId("6293643def1b3ac103e4cb15"),
            owner: new mongoose_1.default.Types.ObjectId("628dfa6ff014bc89f0280c84"),
            brand_id: new mongoose_1.default.Types.ObjectId("62943e1c2008add06c796aa8"),
            color_id: new mongoose_1.default.Types.ObjectId("62935b82b465fdf3f2b8084f"),
            number_plate: "41X56655",
            camera_whitelist: [],
        });
        let car3 = new car_1.default({
            _id: new mongoose_1.default.Types.ObjectId("6293643def1b3ac103e4cb16"),
            owner: new mongoose_1.default.Types.ObjectId("628dfa4df014bc89f0280c80"),
            brand_id: new mongoose_1.default.Types.ObjectId("62943e1c2008add06c796aa7"),
            color_id: new mongoose_1.default.Types.ObjectId("62935b82b465fdf3f2b8084d"),
            number_plate: "15X54185",
            camera_whitelist: [],
        });
        camera1.save();
        camera2.save();
        model.save();
        section.save();
        department.save();
        personnel1.save();
        personnel2.save();
        personnel3.save();
        carBrand1.save();
        carBrand2.save();
        carBrand3.save();
        carColor1.save();
        carColor2.save();
        carColor3.save();
        car1.save();
        car2.save();
        car3.save();
        done();
    });
    //delete model , camera , section , department after test
    after(function (done) {
        model_1.default.findOneAndDelete({ category: "human" }).exec();
        camera_1.default.findOneAndDelete({ name: "eng_door" }).exec();
        camera_1.default.findOneAndDelete({ name: "mali" }).exec();
        camera_1.default.findOneAndDelete({ name: "mali" }).exec();
        camera_1.default.findOneAndDelete({ name: "mali" }).exec();
        camera_1.default.findOneAndDelete({ name: "mali" }).exec();
        camera_1.default.findOneAndDelete({ name: "mali" }).exec();
        section_1.default.findOneAndDelete({ name: "AI" }).exec();
        department_1.default.findOneAndDelete({ name: "ENG" }).exec();
        personnel_1.default.findOneAndDelete({ first_name: "Mohsen" }).exec();
        personnel_1.default.findOneAndDelete({ first_name: "Javad" }).exec();
        personnel_1.default.findOneAndDelete({ first_name: "Zeinab" }).exec();
        carBrand_1.default.findOneAndDelete({ first_name: "lexus" }).exec();
        carBrand_1.default.findOneAndDelete({ first_name: "pars" }).exec();
        carBrand_1.default.findOneAndDelete({ first_name: "dena" }).exec();
        carColor_1.default.findOneAndDelete({ first_name: "white" }).exec();
        carColor_1.default.findOneAndDelete({ first_name: "black" }).exec();
        carColor_1.default.findOneAndDelete({ first_name: "yellow" }).exec();
        car_1.default.findOneAndDelete({ number_plate: "68U54419" }).exec();
        car_1.default.findOneAndDelete({ number_plate: "41X56655" }).exec();
        car_1.default.findOneAndDelete({ number_plate: "15X54185" }).exec();
        done();
    });
    //test get sabotage report sabotage logs with token
    it("should send back a JSON object with all sabotage log report", function (done) {
        (0, supertest_1.default)(server_1.default)
            .post("/api/v1/reports/sabotage?perPage=3&page=1")
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${token}`)
            .expect("Content-Type", /json/)
            .expect(200, function (err, res) {
            if (err) {
                done(err);
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
            .post("/api/v1/reports/sabotage?perPage=10&page=1&search=yes")
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
            probability: [0.5, 1],
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
            (0, chai_1.expect)(response.data[0]).to.have.property("numberOfPeople");
            (0, chai_1.expect)(response.data[0]).to.have.property("allowed");
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
            humanCounts: [1, 10],
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
    // it("should send back a JSON object all event log report", function (done) {
    //   request(app)
    //     .post("/api/v1/reports/event?perPage=10&page=1")
    //     .set("Content-Type", "application/json")
    //     .set("Authorization", `Bearer ${token}`)
    //     .expect("Content-Type", /json/)
    //     .expect(200, function (err, res) {
    //       if (err) {
    //         return done(err);
    //       }
    //       let response = res.body;
    //       expect(response.success).to.be.equal(true);
    //       //   expect(response.da628dc14af014bc89f0280c46ta[0]).to.have.property('camera');
    //       expect(response.data[0]).to.have.property("time");
    //       expect(response.data[0]).to.have.property("camera_id");
    //       expect(response.data[0]).to.have.property("AI");
    //       expect(response.data[0]).to.have.property("description");
    //       done();
    //     });
    // });
    //test get report event logs search with camera_id with token
    // it("should send back a JSON object search event log with camera_id report", function (done) {
    //   request(app)
    //     .post(
    //       "/api/v1/reports/event?perPage=5&page=1&name=camera&search=628dc14af014bc89f0280c46"
    //     )
    //     .set("Content-Type", "application/json")
    //     .set("Authorization", `Bearer ${token}`)
    //     .expect("Content-Type", /json/)
    //     .expect(200, function (err, res) {
    //       if (err) {
    //         return done(err);
    //       }
    //       let response = res.body;
    //       expect(response.success).to.be.equal(true);
    //       //   expect(response.data[0]).to.have.property('camera');
    //       expect(response.data[0]).to.have.property("time");
    //       expect(response.data[0]).to.have.property("camera_id");
    //       expect(response.data[0]).to.have.property("AI");
    //       expect(response.data[0]).to.have.property("description");
    //       done();
    //     });
    // });
    //test get report event logs search with model name with token
    // it("should send back a JSON object search event log with model name report", function (done) {
    //   request(app)
    //     .post("/api/v1/reports/event?perPage=50&page=1&name=ai&search=human")
    //     .set("Content-Type", "application/json")
    //     .set("Authorization", `Bearer ${token}`)
    //     .expect("Content-Type", /json/)
    //     .expect(200, function (err, res) {
    //       if (err) {
    //         return done(err);
    //       }
    //       let response = res.body;
    //       expect(response.success).to.be.equal(true);
    //       //   expect(response.data[0]).to.have.property('camera');
    //       expect(response.data[0]).to.have.property("time");
    //       expect(response.data[0]).to.have.property("camera_id");
    //       expect(response.data[0]).to.have.property("AI");
    //       expect(response.data[0]).to.have.property("description");
    //       done();
    //     });
    // });
    //test get report event logs search with camera_id && model name with token
    // it("should send back a JSON object search event log with camera_id && model name  report", function (done) {
    //   request(app)
    //     .post(
    //       "/api/v1/reports/event?perPage=5&page=1&name=all&search=human+628dc14af014bc89f0280c46"
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
    //       expect(response.success).to.be.equal(true);
    //       //   expect(response.data[0]).to.have.property('camera');
    //       expect(response.data[0]).to.have.property("time");
    //       expect(response.data[0]).to.have.property("camera_id");
    //       expect(response.data[0]).to.have.property("AI");
    //       expect(response.data[0]).to.have.property("description");
    //       done();
    //     });
    // });
    //test get report all department event with token
    // it("should send back a JSON object all department event report", function (done) {
    //   request(app)
    //     .post(
    //       "/api/v1/reportDepartmets?perPage=5&page=1&name=all&search=human+628dc14af014bc89f0280c46"
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
    //       expect(response.success).to.be.equal(true);
    //       //   expect(response.data[0]).to.have.property('camera');
    //       expect(response.data[0]).to.have.property("time");
    //       expect(response.data[0]).to.have.property("sections");
    //       expect(response.data[0]).to.have.property("AI");
    //       expect(response.data[0]).to.have.property("description");
    //       done();
    //     });
    // });
    //test get report department event search by camera_id with token
    // it("should send back a JSON object department event report search by camera_id", function (done) {
    //   request(app)
    //     .post(
    //       "/api/v1/reportDepartmets?perPage=10&page=1&name=camera&search=628dc14af014bc89f0280c46"
    //     )
    //     .set("Content-Type", "application/json")
    //     .set("Authorization", `Bearer ${token}`)
    //     .expect("Content-Type", /json/)
    //     .expect(200, function (err, res) {
    //       if (err) {
    //         return done(err);
    //       }
    //       let response = res.body;
    //       expect(response.success).to.be.equal(true);
    //       //   expect(response.data[0]).to.have.property('camera');
    //       expect(response.data[0]).to.have.property("time");
    //       expect(response.data[0]).to.have.property("sections");
    //       expect(response.data[0]).to.have.property("AI");
    //       expect(response.data[0]).to.have.property("description");
    //       done();
    //     });
    // });
    //test get report department event search by model name with token
    // it("should send back a JSON object department event report search by model name", function (done) {
    //   request(app)
    //     .post("/api/v1/reportDepartmets?perPage=10&page=1&name=ai&search=human")
    //     .set("Content-Type", "application/json")
    //     .set("Authorization", `Bearer ${token}`)
    //     .expect("Content-Type", /json/)
    //     .expect(200, function (err, res) {
    //       if (err) {
    //         return done(err);
    //       }
    //       let response = res.body;
    //       expect(response.success).to.be.equal(true);
    //       //   expect(response.data[0]).to.have.property('camera');
    //       expect(response.data[0]).to.have.property("time");
    //       expect(response.data[0]).to.have.property("sections");
    //       expect(response.data[0]).to.have.property("AI");
    //       expect(response.data[0]).to.have.property("description");
    //       done();
    //     });
    // });
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
    // });
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
            (0, chai_1.expect)(response.data[0]).to.have.property("time");
            (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
            (0, chai_1.expect)(response.data[0]).to.have.property("camera");
            (0, chai_1.expect)(response.data[0]).to.have.property("plate_number");
            (0, chai_1.expect)(response.data[0].plate_number).to.have.property("first");
            (0, chai_1.expect)(response.data[0].plate_number).to.have.property("second");
            (0, chai_1.expect)(response.data[0].plate_number).to.have.property("third");
            (0, chai_1.expect)(response.data[0].plate_number).to.have.property("fourth");
            (0, chai_1.expect)(response.data[0].plate_number).to.have.property("fifth");
            (0, chai_1.expect)(response.data[0]).to.have.property("owner");
            (0, chai_1.expect)(response.data[0]).to.have.property("color");
            (0, chai_1.expect)(response.data[0]).to.have.property("brand");
            (0, chai_1.expect)(response.data[0]).to.have.property("allowed");
            done();
        });
    });
    //test get plate log report search plate logs with token
    it("should send back a JSON object with search plate log report", function (done) {
        (0, supertest_1.default)(server_1.default)
            .post("/api/v1/reports/plate?perPage=50&page=1&search=yes")
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${token}`)
            .send({
            allowed: "true",
            car_brand: [
                "62943e1c2008add06c796aa3",
                "62943e1c2008add06c796aa8",
                "62943e1c2008add06c796aa7",
            ],
            car_color: [
                "62935b82b465fdf3f2b8084f",
                "62935b82b465fdf3f2b8084e",
                "62935b82b465fdf3f2b8084d",
            ],
            date_start: "4/15/2019",
            date_end: "4/15/2023",
            owner: [
                "628dfa6ff014bc89f0280c84",
                "628df9fbf014bc89f0280c7a",
                "628dfa4df014bc89f0280c80",
            ],
            time_end: "05:00",
            time_start: "20:00",
            cameras: ["628dc332f014bc89f0280c56", "628dc14af014bc89f0280c46"],
        })
            .expect("Content-Type", /json/)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let response = res.body;
            console.log(response);
            (0, chai_1.expect)(response.success).to.be.equal(true);
            (0, chai_1.expect)(response.data[0]).to.have.property("time");
            (0, chai_1.expect)(response.data[0]).to.have.property("camera_id");
            (0, chai_1.expect)(response.data[0]).to.have.property("camera");
            (0, chai_1.expect)(response.data[0]).to.have.property("plate_number");
            (0, chai_1.expect)(response.data[0].plate_number).to.have.property("first");
            (0, chai_1.expect)(response.data[0].plate_number).to.have.property("second");
            (0, chai_1.expect)(response.data[0].plate_number).to.have.property("third");
            (0, chai_1.expect)(response.data[0].plate_number).to.have.property("fourth");
            (0, chai_1.expect)(response.data[0].plate_number).to.have.property("fifth");
            (0, chai_1.expect)(response.data[0]).to.have.property("owner");
            (0, chai_1.expect)(response.data[0]).to.have.property("color");
            (0, chai_1.expect)(response.data[0]).to.have.property("brand");
            (0, chai_1.expect)(response.data[0]).to.have.property("allowed");
            done();
        });
    });
});

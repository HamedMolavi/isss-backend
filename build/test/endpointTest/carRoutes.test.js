"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const car_1 = __importDefault(require("../../models/car"));
const EnglishToPersianPlate_1 = __importDefault(require("../../tools/EnglishToPersianPlate"));
const personnel_1 = __importDefault(require("../../models/personnel"));
const mongoose_1 = require("mongoose");
const carBrand_1 = __importDefault(require("../../models/carBrand"));
const carColor_1 = __importDefault(require("../../models/carColor"));
const token = process.env.sample_token;
let _car;
//create testing for register new car and edit , delete ,get car
describe("server run and crud car", function () {
    before(function (done) {
        let personnel = new personnel_1.default({
            _id: new mongoose_1.Schema.Types.ObjectId("628df9bdf014bc89f0280c78"),
            first_name: "Ramin",
            last_name: "Abbasi",
            national_code: "123456789",
            email: "test@test.gmailll.com",
            phone_number: "0123456789",
            job_id: new mongoose_1.Schema.Types.ObjectId("62935d846bc9b97fa0d86a2b"),
            personnel_code: "100",
            section_id: new mongoose_1.Schema.Types.ObjectId("628db904f014bc89f0280c41"),
            camera_whitelist: [new mongoose_1.Schema.Types.ObjectId("628dc28ef014bc89f0280c4a"), new mongoose_1.Schema.Types.ObjectId("62f341a1bd0e4b98100bf973")],
            is_active: true,
            is_employee: true,
            is_dismissed: false,
            create_date: Date.now(),
        });
        personnel.save();
        let car_brand = new carBrand_1.default({
            _id: new mongoose_1.Schema.Types.ObjectId("62943e1c2008add06c796aa3"),
            name: "lexus",
        });
        car_brand.save();
        let car_color = new carColor_1.default({
            _id: new mongoose_1.Schema.Types.ObjectId("62935b82b465fdf3f2b8084e"),
            name: "black",
        });
        car_color.save();
        done();
        // let car = new Car({
        //   _id: new Schema.Types.ObjectId("6293643def1b3ac103e4cb14"),
        //   owner: "628df9bdf014bc89f0280c78",
        //   brand_id: "62943e1c2008add06c796aa3",
        //   color_id: "62935b82b465fdf3f2b8084e",
        //   number_plate: "23U56927",
        //   create_date: Date.now(),
        // });
        // car.save();
    });
    //get plate test from DB
    beforeEach(function (done) {
        //find plate by name
        car_1.default.findOne({
            owner: { $in: ["628df9bdf014bc89f0280c78", "629592546558a38fbecb6e11"] },
            number_plate: { $in: ["1234567", "7654321"] },
        }, (err, car) => {
            if (err) {
                console.log(err);
            }
            _car = car;
            done();
        });
    });
    //test route for register new car in DB
    it("should send back a JSON object with car for create new car", function (done) {
        (0, supertest_1.default)(server_1.default)
            .post("/api/v1/cars")
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${token}`)
            .send({
            _id: new mongoose_1.Schema.Types.ObjectId("6293643def1b3ac103e4cb14"),
            owner: new mongoose_1.Schema.Types.ObjectId("628df9bdf014bc89f0280c78"),
            brand_id: new mongoose_1.Schema.Types.ObjectId("62943e1c2008add06c796aa3"),
            color_id: new mongoose_1.Schema.Types.ObjectId("62935b82b465fdf3f2b8084e"),
            number_plate: "23U56927",
            create_date: Date.now(),
            // owner: "629592546558a38fbecb6d40",
            // number_plate: "23U56927",
            // brand_id: "629592546558a38fbecb6d40",
            // color_id: "629592546558a38fbecb6d40",
            camera_whitelist: ["test"],
        })
            .expect("Content-Type", /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.success === true) {
                let response = res.body.data;
                let _number_plate = {
                    first: Number(response.number_plate.substr(0, 2)).toLocaleString("fa-IR"),
                    second: EnglishToPersianPlate_1.default[response.number_plate.substr(2, 1)],
                    third: Number(response.number_plate.substr(3, 3)).toLocaleString("fa-IR"),
                    fourth: "ایران",
                    fifth: Number(response.number_plate.substr(6, 2)).toLocaleString("fa-IR"),
                };
                (0, chai_1.expect)(response.owner.toString()).to.equal("628df9bdf014bc89f0280c78");
                (0, chai_1.expect)(response.number_plate).to.equal(_number_plate);
                (0, chai_1.expect)(response.brand_id.toString()).to.equal("62943e1c2008add06c796aa3");
                (0, chai_1.expect)(response.color_id.toString()).to.equal("62935b82b465fdf3f2b8084e");
                (0, chai_1.expect)(response.camera_whitelist).to.deep.equal(["test"]);
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //test route for get all cars by id from DB
    it("should send back a JSON object for get all cars", function (done) {
        //test route for get cars in DB
        (0, supertest_1.default)(server_1.default)
            .get("/api/v1/cars?page=1&perPage=10")
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.data;
            (0, chai_1.expect)(userResponse[0]).to.have.property("owner");
            (0, chai_1.expect)(userResponse[0]).to.have.property("number_plate");
            (0, chai_1.expect)(userResponse[0]).to.have.property("brand_id");
            (0, chai_1.expect)(userResponse[0]).to.have.property("color_id");
            (0, chai_1.expect)(userResponse[0]).to.have.property("camera_whitelist");
            // Done
            done();
        });
    });
    //test route for search cars by id from DB
    it("should send back a JSON object for search cars", function (done) {
        //test route for get cars in DB
        (0, supertest_1.default)(server_1.default)
            .get("/api/v1/cars?page=1&perPage=1&search=12")
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.data;
            (0, chai_1.expect)(userResponse[0].owner.toString()).to.equal("628df9bdf014bc89f0280c78");
            (0, chai_1.expect)(userResponse[0].number_plate).to.equal("1234567");
            (0, chai_1.expect)(userResponse[0].brand_id).to.equal("62943e1c2008add06c796aa3");
            (0, chai_1.expect)(userResponse[0].color_id).to.equal("629592546558a38fbecb6d40");
            (0, chai_1.expect)(userResponse[0].camera_whitelist).to.deep.equal(["test"]);
            // Done
            done();
        });
    });
    //test route for get car by id from DB
    it("should send back a JSON object for get car with id", function (done) {
        //test route for get car in DB
        (0, supertest_1.default)(server_1.default)
            .get("/api/v1/cars/" + _car._id)
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.data;
            (0, chai_1.expect)(userResponse.owner.toString()).to.equal("629592546558a38fbecb6d40");
            (0, chai_1.expect)(userResponse.number_plate).to.equal("1234567");
            (0, chai_1.expect)(userResponse.brand_id.toString()).to.equal("629592546558a38fbecb6d40");
            (0, chai_1.expect)(userResponse.color_id.toString()).to.equal("62935b82b465fdf3f2b8084e");
            (0, chai_1.expect)(userResponse.camera_whitelist).to.deep.equal(["test"]);
            // Done
            done();
        });
    });
    //test route for edite car in DB
    it("should send back a JSON object with id for edit car", function (done) {
        let plateEditJson = {
            owner: "629592546558a38fbecb6e11",
            number_plate: "7654321",
        };
        (0, supertest_1.default)(server_1.default)
            .patch("/api/v1/cars/" + _car._id)
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${token}`)
            .send(plateEditJson)
            .expect("Content-Type", /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let plate = res.body.data;
            (0, chai_1.expect)(plate.owner.toString()).to.equal("629592546558a38fbecb6e11");
            (0, chai_1.expect)(plate.number_plate).to.equal("7654321");
            (0, chai_1.expect)(plate.brand_id.toString()).to.equal(_car.brand_id.toString());
            (0, chai_1.expect)(plate.color_id.toString()).to.equal(_car.color_id.toString());
            (0, chai_1.expect)(plate.camera_whitelist).to.deep.equal(_car.camera_whitelist);
            // Done
            done();
        });
    });
    //test route for delete car in DB
    it("should send back a JSON object for delete car", function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete("/api/v1/cars/" + _car._id)
            .set("Content-Type", "application/json")
            .set("Authorization", `Bearer ${token}`)
            .expect("Content-Type", /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let result = res.body;
            (0, chai_1.expect)(result.success).to.equal(true);
            // Done
            done();
        });
    });
});

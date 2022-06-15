"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connectMongo_1 = require("../../db/connectMongo");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../../server");
//test car models
describe('car', function () {
    let Car;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once('connected', () => {
            mongoose_1.default.connection.db.dropDatabase();
            require('../../models/car').registerModels;
            // This is the right model because registerModels set it up for us.
            Car = mongoose_1.default.model('Car');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        (0, connectMongo_1.Disconnect)();
        done();
    });
    //test car model
    describe('register car', function () {
        //create car model
        it('should save car in db', function (done) {
            var car = new Car({
                owner: "test",
                number_plate: "123456",
                brand_id: "629592546558a38fbecb6d40",
                color_id: "629592546558a38fbecb6d40",
                camera_whitelist: [
                    "629592546558a38fbecb6d40"
                ]
            });
            //test this car model
            car.save().then(() => {
                (0, chai_1.expect)(car.owner).to.equal('test');
                (0, chai_1.expect)(car.number_plate).to.equal('123456');
                (0, chai_1.expect)(car.brand_id.toString()).to.equal('629592546558a38fbecb6d40');
                (0, chai_1.expect)(car.color_id.toString()).to.equal('629592546558a38fbecb6d40');
                (0, chai_1.expect)(car.camera_whitelist).to.deep.equal(['629592546558a38fbecb6d40']);
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
});

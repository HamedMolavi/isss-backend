"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connect_1 = require("../../db/connect");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../../server");
//test car models
describe('car', function () {
    let Car;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri, { authSource: 'admin' });
        //listen for connection events
        mongoose_1.default.connection.once('connected', () => {
            //  mongoose.connection.db.dropDatabase();
            require('../../models/car').registerModels;
            // This is the right model because register Models set it up for us.
            Car = mongoose_1.default.model('Car');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        (0, connect_1.Disconnect)();
        done();
    });
    //test car model
    describe('register car', function () {
        //create car model
        it('should save car in db', function (done) {
            var car = new Car({
                name: 'pride',
            });
            //test this car model
            car.save().then(() => {
                (0, chai_1.expect)(car.name).to.equal('pride');
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
});

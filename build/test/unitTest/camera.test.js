"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connect_1 = require("../../db/connect");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../../server");
//test camera models
describe('camera', function () {
    let Camera;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once('connected', () => {
            mongoose_1.default.connection.db.dropDatabase();
            require('../../models/camera').registerModels;
            // This is the right model because ^registerModels set it up for us.
            Camera = mongoose_1.default.model('Camera');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        (0, connect_1.Disconnect)();
        done();
    });
    //test camera model
    describe('register camera', function () {
        //create camera model
        it('should save user in db', function (done) {
            var camera = new Camera({
                ip: '172.10.10.1',
                name: 'offece',
                username: 'test',
                password: '12345',
                rstpLink: 'rtsp://192.168.1.111:554/media/video1'
            });
            //test this camera model
            camera.save().then(() => {
                (0, chai_1.expect)(camera.ip).to.equal('172.10.10.1');
                (0, chai_1.expect)(camera.name).to.equal('offece');
                (0, chai_1.expect)(camera.username).to.equal('test');
                (0, chai_1.expect)(camera.password).to.equal('12345');
                (0, chai_1.expect)(camera.rstpLink).to.equal('rtsp://192.168.1.111:554/media/video1');
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
});

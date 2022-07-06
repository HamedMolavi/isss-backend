"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connectMongo_1 = require("../../../db/connectMongo");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../../../server");
//test camera models
describe('camera', function () {
    let Camera;
    //connect to DB before test
    before(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once('connected', () => {
            // mongoose.connection.db.dropDatabase().then(() => {
            require('./../../../models/camera').registerModels;
            // This is the right model because ^registerModels set it up for us.
            Camera = mongoose_1.default.model('Camera');
            done();
            //    }).catch((err: Error) => {
            //       done(err);
            //    });
        });
    });
    //disconnect from DB after test
    after(function (done) {
        (0, connectMongo_1.Disconnect)();
        done();
    });
    //test camera model
    describe('register camera', function () {
        //create camera model
        it('should save camera in db', function (done) {
            var camera = new Camera({
                network: '172.10.10.1',
                name: 'office',
                section_id: new mongoose_1.default.Types.ObjectId('6283724be1996b883080a495'),
                departement_id: new mongoose_1.default.Types.ObjectId('6283724be1996b883080a495'),
                url: 'rtsp://192.168.1.111:554/media/video1',
                ip: '172.10.10.1',
                username: 'test',
                password: '12345',
                is_enabled: true
            });
            //test this camera model
            camera.save().then(() => {
                (0, chai_1.expect)(camera.network).to.equal('172.10.10.1');
                (0, chai_1.expect)(camera.name).to.equal('office');
                (0, chai_1.expect)(camera.section_id.toString()).to.equal('6283724be1996b883080a495');
                (0, chai_1.expect)(camera.departement_id.toString()).to.equal('6283724be1996b883080a495');
                (0, chai_1.expect)(camera.url).to.equal('rtsp://192.168.1.111:554/media/video1');
                (0, chai_1.expect)(camera.ip).to.equal('172.10.10.1');
                (0, chai_1.expect)(camera.username).to.equal('test');
                (0, chai_1.expect)(camera.password).to.equal('12345');
                (0, chai_1.expect)(camera.is_enabled).to.equal(true);
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const camera_1 = __importDefault(require("../../models/camera"));
const mongoose_1 = __importDefault(require("mongoose"));
const token = process.env.sample_token;
let _camera;
describe('server run and server runnig and crud camera', function () {
    //test route for register new camera in DB
    it('should send back a JSON object with user for create new camera', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/camera/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: 'office',
            section_id: new mongoose_1.default.Types.ObjectId('6283724be1996b883080a495'),
            url: 'rtsp://192.168.1.111:554/media/video1',
            ip: '172.10.10.1',
            username: 'test',
            password: '12345',
            is_enabled: true
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'Camera already exists') {
                let response = res.body.camera;
                (0, chai_1.expect)(response.name).to.equal('office');
                (0, chai_1.expect)(response.section_id.toString()).to.equal('6283724be1996b883080a495');
                (0, chai_1.expect)(response.url).to.equal('rtsp://192.168.1.111:554/media/video1');
                (0, chai_1.expect)(response.ip).to.equal('172.10.10.1');
                (0, chai_1.expect)(response.username).to.equal('test');
                (0, chai_1.expect)(response.password).to.equal('12345');
                (0, chai_1.expect)(response.is_enabled).to.equal(true);
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    beforeEach(function (done) {
        camera_1.default.findOne({
            name: { $in: ['office', 'bank'] },
        }, (err, camera) => {
            if (err) {
                console.log(err);
            }
            _camera = camera;
            console.log(_camera);
            done();
        });
    });
    //test route for get camera by id from DB
    it('should send back a JSON object for get camera with id', function (done) {
        //test route for get camera in DB
        (0, supertest_1.default)(server_1.default)
            .get('/camera/' + _camera._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.camera;
            (0, chai_1.expect)(userResponse.name).to.equal('office');
            (0, chai_1.expect)(userResponse.section_id.toString()).to.equal('6283724be1996b883080a495');
            (0, chai_1.expect)(userResponse.url).to.equal('rtsp://192.168.1.111:554/media/video1');
            (0, chai_1.expect)(userResponse.ip).to.equal('172.10.10.1');
            (0, chai_1.expect)(userResponse.username).to.equal('test');
            (0, chai_1.expect)(userResponse.password).to.equal('12345');
            (0, chai_1.expect)(userResponse.is_enabled).to.equal(true);
            done();
        });
    });
    //test route for get cameras from DB
    it('should send back a JSON object for get all cameras', function (done) {
        //test route for get camera in DB
        (0, supertest_1.default)(server_1.default)
            .get('/camera/list/1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.cameras;
            (0, chai_1.expect)(userResponse[0]).to.have.property('_id');
            (0, chai_1.expect)(userResponse[0]).to.have.property('name');
            (0, chai_1.expect)(userResponse[0]).to.have.property('section_id');
            (0, chai_1.expect)(userResponse[0]).to.have.property('url');
            (0, chai_1.expect)(userResponse[0]).to.have.property('ip');
            (0, chai_1.expect)(userResponse[0]).to.have.property('username');
            (0, chai_1.expect)(userResponse[0]).to.have.property('password');
            (0, chai_1.expect)(userResponse[0]).to.have.property('is_enabled');
            // Done
            done();
        });
    });
    //test route for edite camera in DB
    it('should send back a JSON object with id for edit camera', function (done) {
        let cameraEditJson = {
            name: 'bank',
            ip: '172.01.01.01',
        };
        (0, supertest_1.default)(server_1.default)
            .put('/camera/' + _camera._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(cameraEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let camera = res.body.camera;
            (0, chai_1.expect)(camera.name).to.equal(cameraEditJson.name);
            (0, chai_1.expect)(camera.section_id.toString()).to.equal(_camera.section_id.toString());
            (0, chai_1.expect)(camera.ip).to.equal(cameraEditJson.ip);
            (0, chai_1.expect)(camera.url).to.equal(_camera.url);
            (0, chai_1.expect)(camera.username).to.equal(_camera.username);
            (0, chai_1.expect)(camera.password).to.equal(_camera.password);
            (0, chai_1.expect)(camera.is_enabled).to.equal(_camera.is_enabled);
            // Done
            done();
        });
    });
    //test route for delete camera in DB 
    it('should send back a JSON object for delete camera', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/camera/' + _camera._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let result = res.body;
            (0, chai_1.expect)(result.message).to.equal("Success");
            // expect(result.message.camera).to.equal(null);
            // Done
            done();
        });
    });
});

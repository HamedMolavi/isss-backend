"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const camera_1 = __importDefault(require("../../models/camera"));
const token = process.env.sample_token;
let _camera;
describe('server run and server runnig and crud camera', function () {
    beforeEach(function (done) {
        camera_1.default.findOne({ username: 'test' }, (err, camera) => {
            _camera = camera;
            done();
        });
    });
    //test route for register new camera in DB
    it('should send back a JSON object with user for create new camera', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/camera/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            ip: '172.10.10.1',
            name: 'offece',
            username: 'test',
            password: '12345',
            rstpLink: 'rtsp://192.168.1.111:554/media/video1'
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'Camera already exists') {
                let response = res.body;
                (0, chai_1.expect)(response.message).to.equal("Camera created");
                (0, chai_1.expect)(response.camera.ip).to.equal('172.10.10.1');
                (0, chai_1.expect)(response.camera.name).to.equal('offece');
                (0, chai_1.expect)(response.camera.username).to.equal('test');
                (0, chai_1.expect)(response.camera.password).to.equal('12345');
                (0, chai_1.expect)(response.camera.rstpLink).to.equal('rtsp://192.168.1.111:554/media/video1');
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //test route for get camera by name from DB
    it('should send back a JSON object for get camera with name', function (done) {
        //test route for get camera in DB
        (0, supertest_1.default)(server_1.default)
            .get('/camera/' + _camera.name)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.camera;
            (0, chai_1.expect)(userResponse.ip).to.equal(_camera.ip);
            (0, chai_1.expect)(userResponse.name).to.equal(_camera.name);
            (0, chai_1.expect)(userResponse.username).to.equal(_camera.username);
            (0, chai_1.expect)(userResponse.password).to.equal(_camera.password);
            (0, chai_1.expect)(userResponse.rstpLink).to.equal(_camera.rstpLink);
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
            (0, chai_1.expect)(camera.ip).to.equal(cameraEditJson.ip);
            (0, chai_1.expect)(camera.name).to.equal(cameraEditJson.name);
            (0, chai_1.expect)(camera.username).to.equal(_camera.username);
            (0, chai_1.expect)(camera.password).to.equal(_camera.password);
            (0, chai_1.expect)(camera.rstpLink).to.equal(_camera.rstpLink);
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
            (0, chai_1.expect)(result.message).to.equal("camera Deleted");
            // Done
            done();
        });
    });
});

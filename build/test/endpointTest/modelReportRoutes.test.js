"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const token = process.env.sample_token;
describe('server run and get report logs', function () {
    //test get sabotage report sabotage logs with token 
    it('should send back a JSON object with all sabotage log report', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/reports/sabotage?perPage=10&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let response = res.body;
            (0, chai_1.expect)(response.message).to.be.equal('Success');
            (0, chai_1.expect)(response.data[0]).to.have.property('time');
            (0, chai_1.expect)(response.data[0]).to.have.property('camera_id');
            done();
        });
    });
    //test search sabotage report sabotage logs with token 
    it('should send back a JSON object search sabotage log report', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/reports/sabotage?perPage=300&page=1&search=628dc28ef014bc89f0280c4a')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            time: "05:30",
            date_start: "15.04.2021",
            date_end: "15.04.2023"
        })
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let response = res.body;
            console.log(response);
            (0, chai_1.expect)(response.message).to.be.equal('Success');
            (0, chai_1.expect)(response.data[0]).to.have.property('time');
            (0, chai_1.expect)(response.data[0]).to.have.property('camera_id');
            done();
        });
    });
    //test get fire report fire logs with token 
    it('should send back a JSON object with all fire log report', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/reports/fire?perPage=200&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let response = res.body;
            (0, chai_1.expect)(response.message).to.be.equal('Success');
            (0, chai_1.expect)(response.data[0]).to.have.property('camera_id');
            // expect(response.data[0]).to.have.property('camera');
            (0, chai_1.expect)(response.data[0]).to.have.property('time');
            (0, chai_1.expect)(response.data[0]).to.have.property('probability');
            done();
        });
    });
    //test search fire  logs with token 
    it('should send back a JSON object search fire log report', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/reports/fire?perPage=50&page=1&search=628dc28ef014bc89f0280c4a')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            time: "05:30",
            date_start: "15.04.2021",
            date_end: "15.04.2023",
            probability: 0.5
        })
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let response = res.body;
            console.log(response);
            (0, chai_1.expect)(response.message).to.be.equal('Success');
            //  expect(response.data[0]).to.have.property('camera');
            (0, chai_1.expect)(response.data[0]).to.have.property('time');
            (0, chai_1.expect)(response.data[0]).to.have.property('camera_id');
            (0, chai_1.expect)(response.data[0]).to.have.property('probability');
            done();
        });
    });
    //test get  all face logs with token 
    it('should send back a JSON object with all face log report', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/reports/face?perPage=10&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let response = res.body;
            (0, chai_1.expect)(response.message).to.be.equal('Success');
            // expect(response.data[0]).to.have.property('camera');
            (0, chai_1.expect)(response.data[0]).to.have.property('time');
            (0, chai_1.expect)(response.data[0]).to.have.property('camera_id');
            //   expect(response.data[0]).to.have.property('fullName');
            //  expect(response.data[0]).to.have.property('Allowed');
            done();
        });
    });
    //test get fire report face logs with token 
    it('should send back a JSON object search face log report', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/reports/face?perPage=3&page=1&search=628dc28ef014bc89f0280c4a')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            time: "05:30",
            date_start: "15.04.2021",
            date_end: "15.04.2023",
            personnel_id: "62ada289eac910a0f3f0c42e"
        })
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let response = res.body;
            console.log(response);
            (0, chai_1.expect)(response.message).to.be.equal('Success');
            //  expect(response.data[0]).to.have.property('camera');
            (0, chai_1.expect)(response.data[0]).to.have.property('time');
            (0, chai_1.expect)(response.data[0]).to.have.property('camera_id');
            //  expect(response.data[0]).to.have.property('fullName');
            //  expect(response.data[0]).to.have.property('Allowed');
            done();
        });
    });
    //test get all report people counting logs with token 
    it('should send back a JSON object all people counting log report', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/reports/human?perPage=3&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let response = res.body;
            (0, chai_1.expect)(response.message).to.be.equal('Success');
            //   expect(response.data[0]).to.have.property('camera');
            (0, chai_1.expect)(response.data[0]).to.have.property('time');
            (0, chai_1.expect)(response.data[0]).to.have.property('camera_id');
            (0, chai_1.expect)(response.data[0]).to.have.property('NumberOfPeople');
            done();
        });
    });
    //test get fire report people counting logs with token 
    it('should send back a JSON object search people counting log report', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/reports/human?perPage=3&page=1&search=628dc28ef014bc89f0280c4a')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            time: "05:30",
            date_start: "15.04.2021",
            date_end: "15.04.2023"
        })
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let response = res.body;
            (0, chai_1.expect)(response.message).to.be.equal('Success');
            //   expect(response.data[0]).to.have.property('camera');
            (0, chai_1.expect)(response.data[0]).to.have.property('time');
            (0, chai_1.expect)(response.data[0]).to.have.property('camera_id');
            (0, chai_1.expect)(response.data[0]).to.have.property('NumberOfPeople');
            done();
        });
    });
    //  //test get fire report people counting logs with token 
    //  it('should send back a JSON object with people counting log report', function (done) {
    //    //todo
    // });
});

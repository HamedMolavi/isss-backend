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
    it('should send back a JSON object with sabotage log report', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/api/v1/reportmodels/sabotage?perPage=3&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            camera_id: 5,
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
            (0, chai_1.expect)(response.report.hits.hits).to.be.an('Array');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties).to.be.an('Object');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.camera_id).to.be.an('Number');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.timestamp).to.be.an('Number');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.m2c_id).to.be.an('Number');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.confidence).to.be.an('Number');
            done();
        });
    });
    //test get fire report fire logs with token 
    it('should send back a JSON object with fire log report', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/api/v1/reportmodels/fire?perPage=3&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            camera_id: "628dc289f014bc89f0280c48",
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
            (0, chai_1.expect)(response.message).to.be.equal('Success');
            (0, chai_1.expect)(response.report.hits.hits).to.be.an('Array');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties).to.be.an('Object');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.camera_id).to.be.an('String');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.timestamp).to.be.an('Number');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.m2c_id).to.be.an('String');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.confidence).to.be.an('Number');
            done();
        });
    });
    //test get fire report face logs with token 
    it('should send back a JSON object with face log report', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/api/v1/reportmodels/face?perPage=3&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            camera_id: "628dc28ef014bc89f0280c4a",
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
            (0, chai_1.expect)(response.message).to.be.equal('Success');
            (0, chai_1.expect)(response.report).to.be.an('Array');
            (0, chai_1.expect)(response.report[0]).to.be.an('Object');
            (0, chai_1.expect)(response.report[0].camera_id).to.be.an('String');
            (0, chai_1.expect)(response.report[0].timestamp).to.be.an('Number');
            (0, chai_1.expect)(response.report[0].fullname).to.be.an('String');
            done();
        });
    });
    //test get fire report people counting logs with token 
    it('should send back a JSON object with people counting log report', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/api/v1/reportmodels/human?perPage=3&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            camera_id: "628dc28ef014bc89f0280c4a",
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
            (0, chai_1.expect)(response.message).to.be.equal('Success');
            (0, chai_1.expect)(response.report.hits.hits).to.be.an('Array');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties).to.be.an('Object');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.camera_id).to.be.an('String');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.timestamp).to.be.an('Number');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.m2c_id).to.be.an('String');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.confidence).to.be.an('Number');
            (0, chai_1.expect)(response.report.hits.hits[0]._source.properties.number_of_people).to.be.an('Number');
            done();
        });
    });
    //  //test get fire report people counting logs with token 
    //  it('should send back a JSON object with people counting log report', function (done) {
    //    //todo
    // });
});

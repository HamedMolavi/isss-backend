"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const AI_1 = __importDefault(require("../../models/AI"));
const token = process.env.sample_token;
let _AI;
//create testing for register new AI and edit , delete ,get personnel
describe('server run and crud AI', function () {
    //get AI test from DB
    beforeEach(function (done) {
        //find AI by name
        AI_1.default.findOne({
            start: "2019-01-01T00:00:00.000Z",
            end: "2019-01-01T00:00:00.000Z",
            type: "type1",
        }, (err, Ai) => {
            _AI = Ai;
            done();
        });
    });
    //test route for register new AI in DB
    it('should send back a JSON object with AI for create new AI', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/AI/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            start: "2019-01-01T00:00:00.000Z",
            end: "2019-01-01T00:00:00.000Z",
            thresholdid: 85,
            minTime: "2019-01-01T00:00:00.000Z",
            zone: ["zone1", "zone2"],
            type: "type1",
            minPeople: 1,
            maxPeople: 2
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'AI already exists') {
                let response = res.body;
                (0, chai_1.expect)(response.AI.start).to.equal("2019-01-01T00:00:00.000Z");
                (0, chai_1.expect)(response.AI.end).to.equal("2019-01-01T00:00:00.000Z");
                (0, chai_1.expect)(response.AI.thresholdid).to.equal(85);
                (0, chai_1.expect)(response.AI.minTime).to.equal("2019-01-01T00:00:00.000Z");
                (0, chai_1.expect)(response.AI.zone[0]).to.equal("zone1");
                (0, chai_1.expect)(response.AI.zone[1]).to.equal("zone2");
                (0, chai_1.expect)(response.AI.type).to.equal("type1");
                (0, chai_1.expect)(response.AI.minPeople).to.equal(1);
                (0, chai_1.expect)(response.AI.maxPeople).to.equal(2);
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //test route for get AI by id from DB
    it('should send back a JSON object for get AI with id', function (done) {
        //test route for get AI in DB
        (0, supertest_1.default)(server_1.default)
            .get('/AI/' + _AI._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.AI;
            (0, chai_1.expect)(userResponse.start).to.equal(_AI.start);
            (0, chai_1.expect)(userResponse.end).to.equal(_AI.end);
            (0, chai_1.expect)(userResponse.thresholdid).to.equal(_AI.thresholdid);
            (0, chai_1.expect)(userResponse.minTime).to.equal(_AI.minTime);
            (0, chai_1.expect)(userResponse.zone[0]).to.equal('zone1');
            (0, chai_1.expect)(userResponse.zone[1]).to.equal('zone2');
            (0, chai_1.expect)(userResponse.type).to.equal(_AI.type);
            (0, chai_1.expect)(userResponse.minPeople).to.equal(_AI.minPeople);
            (0, chai_1.expect)(userResponse.maxPeople).to.equal(_AI.maxPeople);
            // Done
            done();
        });
    });
    //test route for edite AI in DB
    it('should send back a JSON object with id for edit AI', function (done) {
        let AiEditJson = {
            thresholdid: 50,
            start: "2020-01-01T00:00:00.000Z",
            end: "2021-01-01T00:00:00.000Z",
        };
        (0, supertest_1.default)(server_1.default)
            .put('/AI/' + _AI._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(AiEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let AI = res.body.AI;
            (0, chai_1.expect)(AI.start).to.equal(AiEditJson.start);
            (0, chai_1.expect)(AI.end).to.equal(AiEditJson.end);
            (0, chai_1.expect)(AI.thresholdid).to.equal(AiEditJson.thresholdid);
            (0, chai_1.expect)(AI.minTime).to.equal(_AI.minTime);
            (0, chai_1.expect)(AI.zone[0]).to.equal("zone1");
            (0, chai_1.expect)(AI.zone[1]).to.equal("zone2");
            (0, chai_1.expect)(AI.type).to.equal(_AI.type);
            (0, chai_1.expect)(AI.minPeople).to.equal(_AI.minPeople);
            (0, chai_1.expect)(AI.maxPeople).to.equal(_AI.maxPeople);
            // Done
            done();
        });
    });
    //test route for delete AI in DB 
    it('should send back a JSON object for delete AI', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/AI/' + _AI._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let result = res.body;
            (0, chai_1.expect)(result.message).to.equal("AI Deleted");
            // Done
            done();
        });
    });
});

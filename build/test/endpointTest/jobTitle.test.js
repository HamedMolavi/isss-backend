"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const jobTitle_1 = __importDefault(require("../../models/jobTitle"));
const token = process.env.sample_token;
let _jobTitle;
//create testing for register new jobTitle and edit , delete ,get jobTitle
describe('server run and crud jobTitle', function () {
    //test route for register new jobTitle in DB
    it('should send back a JSON object with jobTitle for create new jobTitle', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/jobTitle/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: 'developer'
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'jobTitle already exists') {
                let response = res.body;
                (0, chai_1.expect)(response.jobTitle.name).to.equal('developer');
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //get jobTitle test from DB
    beforeEach(function (done) {
        //find jobTitle by name
        jobTitle_1.default.findOne({
            name: { $in: ['developer', 'police'] }
        }, (err, jobTitle) => {
            if (err) {
                console.log(err);
            }
            _jobTitle = jobTitle;
            done();
        });
    });
    //test route for get jobTitle by id from DB
    it('should send back a JSON object for get jobTitle with id', function (done) {
        //test route for get camera in DB
        (0, supertest_1.default)(server_1.default)
            .get('/jobTitle/' + _jobTitle._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.jobTitle;
            (0, chai_1.expect)(userResponse.name).to.equal(_jobTitle.name);
            // Done
            done();
        });
    });
    //test route for edite jobTitle in DB
    it('should send back a JSON object with id for edit jobTitle', function (done) {
        let jobTitleEditJson = {
            name: 'police'
        };
        (0, supertest_1.default)(server_1.default)
            .put('/jobTitle/' + _jobTitle._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(jobTitleEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let jobTitle = res.body.jobTitle;
            (0, chai_1.expect)(jobTitle.name).to.equal(jobTitleEditJson.name);
            ;
            // Done
            done();
        });
    });
    //test route for delete jobTitle in DB 
    it('should send back a JSON object for delete jobTitle', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/jobTitle/' + _jobTitle._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let result = res.body;
            (0, chai_1.expect)(result.message).to.equal("Success");
            // Done
            done();
        });
    });
});

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
            .post('/api/v1/jobTitles/')
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
                let response = res.body.data;
                (0, chai_1.expect)(response.name).to.equal('developer');
                (0, chai_1.expect)(response).to.have.property('_id');
                (0, chai_1.expect)(response).to.have.property('name');
                (0, chai_1.expect)(response).to.have.property('create_date');
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
    //test route for get all jobTitles from DB
    it('should send back a JSON object for get all jobTitle', function (done) {
        //test route for get jobTitles in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/jobTitles?page=1&perPage=3')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.data;
            (0, chai_1.expect)(userResponse[0]).have.to.property('name');
            // Done
            done();
        });
    });
    //test route for search jobTitles from DB
    it('should send back a JSON object for search jobTitle', function (done) {
        //test route for get jobTitles in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/jobTitles?page=1&perPage=3&search=dev')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.data;
            (0, chai_1.expect)(userResponse[0]).have.to.property('name');
            // Done
            done();
        });
    });
    //test route for get jobTitle by id from DB
    it('should send back a JSON object for get jobTitle with id', function (done) {
        //test route for get jobTitle in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/jobTitles/' + _jobTitle._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.data;
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
        //test route for edit jobTitle in DB
        (0, supertest_1.default)(server_1.default)
            .patch('/api/v1/jobTitles/' + _jobTitle._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(jobTitleEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let jobTitle = res.body.data;
            (0, chai_1.expect)(jobTitle.name).to.equal(jobTitleEditJson.name);
            ;
            // Done
            done();
        });
    });
    //test route for delete jobTitle in DB 
    it('should send back a JSON object for delete jobTitle', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/api/v1/jobTitles/' + _jobTitle._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let result = res.body;
            (0, chai_1.expect)(result.success).to.equal(true);
            // Done
            done();
        });
    });
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const section_1 = __importDefault(require("../../models/section"));
const mongoose_1 = __importDefault(require("mongoose"));
const token = process.env.sample_token;
let _section;
//create testing for register new section and edit , delete ,get section
describe('server run and crud section', function () {
    //get departenet test from DB
    beforeEach(function (done) {
        //find section by name
        section_1.default.findOne({
            name: { $in: ['section1', 'section2'] }
        }, (err, section) => {
            if (err) {
                console.log(err);
            }
            _section = section;
            done();
        });
    });
    //test route for register new section in DB
    it('should send back a JSON object with section for create new section', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/section/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: 'section1',
            departement_id: new mongoose_1.default.Types.ObjectId('6283724be1996b883080a495')
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'section already exists') {
                let response = res.body;
                (0, chai_1.expect)(response.section.name).to.equal('section1');
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //test route for get all sections from DB
    it('should send back a JSON object for get all sections', function (done) {
        //test route for get section in DB
        (0, supertest_1.default)(server_1.default)
            .get('/section/list')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.sections;
            (0, chai_1.expect)(userResponse[0]).to.have.property('name');
            // Done
            done();
        });
    });
    //test route for get section by id from DB
    it('should send back a JSON object for get section with id', function (done) {
        //test route for get section in DB
        (0, supertest_1.default)(server_1.default)
            .get('/section/' + _section._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.section;
            (0, chai_1.expect)(userResponse.name).to.equal(_section.name);
            // Done
            done();
        });
    });
    //test route for edite section in DB
    it('should send back a JSON object with id for edit section', function (done) {
        let sectionEditJson = {
            name: 'section2'
        };
        (0, supertest_1.default)(server_1.default)
            .put('/section/' + _section._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(sectionEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let section = res.body.section;
            (0, chai_1.expect)(section.name).to.equal(sectionEditJson.name);
            (0, chai_1.expect)(section.departement).to.equal(section.departement);
            // Done
            done();
        });
    });
    //test route for delete section in DB 
    it('should send back a JSON object for delete section', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/section/' + _section._id)
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

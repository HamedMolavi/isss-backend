"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const personnel_1 = __importDefault(require("../../models/personnel"));
const mongoose_1 = __importDefault(require("mongoose"));
const token = process.env.sample_token;
let _personnel;
//create testing for register new personnel and edit , delete ,get personnel
describe('server run and crud personnel', function () {
    //get personnel test from DB
    beforeEach(function (done) {
        //find personnel by name
        personnel_1.default.findOne({ name: 'jack' }, (err, personnel) => {
            _personnel = personnel;
            done();
        });
    });
    //test route for register new personnel in DB
    it('should send back a JSON object with section for create new personnel', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/personnel/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: 'jack',
            family: 'jackson',
            phone: '09122222222',
            jobTitle: new mongoose_1.default.Types.ObjectId('6283724be1996b883080a495')
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'personnel already exists') {
                let response = res.body;
                (0, chai_1.expect)(response.personnel.name).to.equal('jack');
                (0, chai_1.expect)(response.personnel.family).to.equal('jackson');
                (0, chai_1.expect)(response.personnel.phone).to.equal('09122222222');
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //test route for get personnel by id from DB
    it('should send back a JSON object for get personnel with id', function (done) {
        //test route for get personnel in DB
        (0, supertest_1.default)(server_1.default)
            .get('/personnel/' + _personnel._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.personnel;
            (0, chai_1.expect)(userResponse.name).to.equal(_personnel.name);
            (0, chai_1.expect)(userResponse.family).to.equal(_personnel.family);
            (0, chai_1.expect)(userResponse.phone).to.equal(_personnel.phone);
            // Done
            done();
        });
    });
    //test route for edite personnel in DB
    it('should send back a JSON object with id for edit personnel', function (done) {
        let personnelEditJson = {
            name: 'john',
            family: 'johnson',
        };
        (0, supertest_1.default)(server_1.default)
            .put('/personnel/' + _personnel._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(personnelEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let personnel = res.body.personnel;
            (0, chai_1.expect)(personnel.name).to.equal(personnelEditJson.name);
            (0, chai_1.expect)(personnel.family).to.equal(personnelEditJson.family);
            (0, chai_1.expect)(personnel.phone).to.equal(personnel.phone);
            (0, chai_1.expect)(personnel.jobTitle).to.equal(personnel.jobTitle);
            // Done
            done();
        });
    });
    //test route for delete personnel in DB 
    it('should send back a JSON object for delete personnel', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/personnel/' + _personnel._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let result = res.body;
            (0, chai_1.expect)(result.message).to.equal("personnel Deleted");
            // Done
            done();
        });
    });
});

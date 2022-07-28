"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const personnel_1 = __importDefault(require("../../models/personnel"));
const token = process.env.sample_token;
let _personnel;
//create testing for register new personnel and edit , delete ,get personnel
describe('server run and crud personnel', function () {
    //test route for register new personnel in DB
    it('should send back a JSON object with personnel for create new personnel', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/api/v1/personnels/')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            first_name: "jack",
            last_name: "jackson",
            national_code: "123456789",
            email: "test@test.gmail.com",
            phone_number: "09122222222",
            job_id: "6283724be1996b883080a495",
            personnel_code: "6283724be1996b883080a495",
            section_id: "6283724be1996b883080a495",
            camera_whitelist: ["6283724be1996b883080a495", "6283724be1996b883080a495"],
            is_active: true,
            is_employee: true,
            is_dismissed: true
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'Personnel already exists') {
                let response = res.body.data;
                (0, chai_1.expect)(response.first_name).to.equal('jack');
                (0, chai_1.expect)(response.last_name).to.equal('jackson');
                (0, chai_1.expect)(response.national_code).to.equal('123456789');
                (0, chai_1.expect)(response.email).to.equal("test@test.gmail.com");
                (0, chai_1.expect)(response.phone_number).to.equal("09122222222");
                (0, chai_1.expect)(response.job_id).to.equal("6283724be1996b883080a495");
                (0, chai_1.expect)(response.personnel_code).to.equal("6283724be1996b883080a495");
                (0, chai_1.expect)(response.section_id).to.equal("6283724be1996b883080a495");
                (0, chai_1.expect)(response.camera_whitelist).to.deep.equal(["6283724be1996b883080a495", "6283724be1996b883080a495"]);
                (0, chai_1.expect)(response.is_active).to.equal(true);
                (0, chai_1.expect)(response.is_employee).to.equal(true);
                (0, chai_1.expect)(response.is_dismissed).to.equal(true);
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //get personnel test from DB
    beforeEach(function (done) {
        //find personnel by name
        personnel_1.default.findOne({
            name: { $in: ['jack', 'john'] },
            family: { $in: ['jackson', 'johnson'] },
        }, (err, personnel) => {
            if (err) {
                console.log(err);
            }
            _personnel = personnel;
            done();
        });
    });
    //test route for get all personnels from DB
    it('should send back a JSON object for get all personnels', function (done) {
        //test route for get personnel in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/personnels?page=1&perPage=3')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.data;
            (0, chai_1.expect)(userResponse[0]).to.have.property('first_name');
            (0, chai_1.expect)(userResponse[0]).to.have.property('last_name');
            (0, chai_1.expect)(userResponse[0]).to.have.property('national_code');
            (0, chai_1.expect)(userResponse[0]).to.have.property('email');
            (0, chai_1.expect)(userResponse[0]).to.have.property('phone_number');
            (0, chai_1.expect)(userResponse[0]).to.have.property('job_id');
            (0, chai_1.expect)(userResponse[0]).to.have.property('personnel_code');
            (0, chai_1.expect)(userResponse[0]).to.have.property('section_id');
            (0, chai_1.expect)(userResponse[0]).to.have.property('camera_whitelist');
            (0, chai_1.expect)(userResponse[0]).to.have.property('is_active');
            (0, chai_1.expect)(userResponse[0]).to.have.property('is_employee');
            (0, chai_1.expect)(userResponse[0]).to.have.property('is_dismissed');
            // Done
            done();
        });
    });
    //test route for search personnels from DB
    it('should send back a JSON object for search personnels', function (done) {
        //test route for get personnel in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/personnels?page=1&perPage=3&search=j')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.data;
            (0, chai_1.expect)(userResponse[0]).to.have.property('first_name');
            (0, chai_1.expect)(userResponse[0]).to.have.property('last_name');
            (0, chai_1.expect)(userResponse[0]).to.have.property('national_code');
            (0, chai_1.expect)(userResponse[0]).to.have.property('email');
            (0, chai_1.expect)(userResponse[0]).to.have.property('phone_number');
            (0, chai_1.expect)(userResponse[0]).to.have.property('job_id');
            (0, chai_1.expect)(userResponse[0]).to.have.property('personnel_code');
            (0, chai_1.expect)(userResponse[0]).to.have.property('section_id');
            (0, chai_1.expect)(userResponse[0]).to.have.property('camera_whitelist');
            (0, chai_1.expect)(userResponse[0]).to.have.property('is_active');
            (0, chai_1.expect)(userResponse[0]).to.have.property('is_employee');
            (0, chai_1.expect)(userResponse[0]).to.have.property('is_dismissed');
            // Done
            done();
        });
    });
    //test route for get personnel by id from DB
    it('should send back a JSON object for get personnel with id', function (done) {
        //test route for get personnel in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/personnels/' + _personnel._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.data;
            (0, chai_1.expect)(userResponse).to.have.property('first_name');
            // Done
            done();
        });
    });
    //test route for edite personnel in DB
    it('should send back a JSON object with id for edit personnel', function (done) {
        let personnelEditJson = {
            first_name: 'john',
            last_name: 'johnson',
        };
        (0, supertest_1.default)(server_1.default)
            .patch('/api/v1/personnels/' + _personnel._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(personnelEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let personnel = res.body.data;
            (0, chai_1.expect)(personnel.first_name).to.equal('john');
            (0, chai_1.expect)(personnel.last_name).to.equal('johnson');
            (0, chai_1.expect)(personnel.national_code).to.equal('123456789');
            (0, chai_1.expect)(personnel.email).to.equal("test@test.gmail.com");
            (0, chai_1.expect)(personnel.phone_number).to.equal("09122222222");
            (0, chai_1.expect)(personnel.job_id).to.equal("6283724be1996b883080a495");
            (0, chai_1.expect)(personnel.personnel_code).to.equal("6283724be1996b883080a495");
            (0, chai_1.expect)(personnel.section_id).to.equal("6283724be1996b883080a495");
            (0, chai_1.expect)(personnel.camera_whitelist).to.deep.equal(["6283724be1996b883080a495", "6283724be1996b883080a495"]);
            (0, chai_1.expect)(personnel.is_active).to.equal(true);
            (0, chai_1.expect)(personnel.is_employee).to.equal(true);
            (0, chai_1.expect)(personnel.is_dismissed).to.equal(true);
            // Done
            done();
        });
    });
    //test route for delete personnel in DB 
    it('should send back a JSON object for delete personnel', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/api/v1/personnels/' + _personnel._id)
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

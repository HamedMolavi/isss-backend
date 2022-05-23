"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const departement_1 = __importDefault(require("../../models/departement"));
const token = process.env.sample_token;
let _departement;
let _updateDepartement;
//create testing for register new departement and edit , delete ,get departement
describe('server run and crud departement', function () {
    //test route for register new departement in DB
    it('should send back a JSON object with departement for create new departement', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/departement/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: 'office'
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'departement already exists') {
                let response = res.body;
                (0, chai_1.expect)(response.departement.name).to.equal('office');
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //get departenet test from DB
    beforeEach(function (done) {
        departement_1.default.findOne({
            name: { $in: ['office', 'bank'] }
        }, function (err, departement) {
            if (err) {
                console.log(err);
            }
            _departement = departement;
            done();
        });
    });
    //test route for get departement by id from DB
    it('should send back a JSON object for get departement with id', function (done) {
        //test route for get camera in DB
        (0, supertest_1.default)(server_1.default)
            .get('/departement/' + _departement._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.departement;
            (0, chai_1.expect)(userResponse.name).to.equal(_departement.name);
            // Done
            done();
        });
    });
    //test route for edite departement in DB
    it('should send back a JSON object with id for edit departement', function (done) {
        let departementEditJson = {
            name: 'bank'
        };
        (0, supertest_1.default)(server_1.default)
            .put('/departement/' + _departement._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(departementEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let departement = res.body.departement;
            (0, chai_1.expect)(departement.name).to.equal(departementEditJson.name);
            ;
            // Done
            done();
        });
    });
    //test route for delete departement in DB 
    it('should send back a JSON object for delete departement', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/departement/' + _departement._id)
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

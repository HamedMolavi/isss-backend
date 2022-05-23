"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const plate_1 = __importDefault(require("../../models/plate"));
const token = process.env.sample_token;
let _plate;
//create testing for register new plate and edit , delete ,get plate
describe('server run and crud plate', function () {
    //get plate test from DB
    beforeEach(function (done) {
        //find plate by name
        plate_1.default.findOne({
            ncolor: { $in: ['red', 'blue'] },
            number: { $in: ['1234567', '9876543'] }
        }, (err, plate) => {
            if (err) {
                console.log(err);
            }
            _plate = plate;
            done();
        });
    });
    //test route for register new plate in DB
    it('should send back a JSON object with section for create new plate', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/plate/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            number: '1234567',
            carBrand: 'BMW',
            color: 'red',
            owner: 'jhon'
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'plate already exists') {
                let response = res.body;
                (0, chai_1.expect)(response.plate.number).to.equal('1234567');
                (0, chai_1.expect)(response.plate.carBrand).to.equal('BMW');
                (0, chai_1.expect)(response.plate.color).to.equal('red');
                (0, chai_1.expect)(response.plate.owner).to.equal('jhon');
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //test route for get plate by id from DB
    it('should send back a JSON object for get plate with id', function (done) {
        //test route for get plate in DB
        (0, supertest_1.default)(server_1.default)
            .get('/plate/' + _plate._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.plate;
            (0, chai_1.expect)(userResponse.number).to.equal(_plate.number);
            (0, chai_1.expect)(userResponse.carBrand).to.equal(_plate.carBrand);
            (0, chai_1.expect)(userResponse.color).to.equal(_plate.color);
            (0, chai_1.expect)(userResponse.owner).to.equal(_plate.owner);
            // Done
            done();
        });
    });
    //test route for edite plate in DB
    it('should send back a JSON object with id for edit plate', function (done) {
        let plateEditJson = {
            color: 'blue',
            number: '9876543',
        };
        (0, supertest_1.default)(server_1.default)
            .put('/plate/' + _plate._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(plateEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let plate = res.body.plate;
            (0, chai_1.expect)(plate.number).to.equal(plateEditJson.number);
            (0, chai_1.expect)(plate.color).to.equal(plateEditJson.color);
            (0, chai_1.expect)(plate.carBrand).to.equal(plate.carBrand);
            (0, chai_1.expect)(plate.owner).to.equal(plate.owner);
            // Done
            done();
        });
    });
    //test route for delete plate in DB 
    it('should send back a JSON object for delete plate', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/plate/' + _plate._id)
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

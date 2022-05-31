"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const car_1 = __importDefault(require("../../models/car"));
const token = process.env.sample_token;
let _car;
let _updateCar;
//create testing for register new car and edit , delete ,get car
describe('server run and crud car', function () {
    //test route for register new car in DB
    it('should send back a JSON object with car for create new car', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/car/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: 'pride'
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'car already exists') {
                let response = res.body;
                (0, chai_1.expect)(response.car.name).to.equal('pride');
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //get car test from DB
    beforeEach(function (done) {
        car_1.default.findOne({
            name: 'pride'
        }, function (err, car) {
            if (err) {
                console.log(err);
            }
            _car = car;
            done();
        });
    });
    //test route for get all cars from DB
    it('should send back a JSON object for get all cars', function (done) {
        //test route for get car in DB
        (0, supertest_1.default)(server_1.default)
            .get('/car/list?page=1&perPage=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.cars;
            (0, chai_1.expect)(userResponse[0]).to.have.property('name');
            // Done
            done();
        });
    });
    //test route for get car by id from DB
    it('should send back a JSON object for get car with id', function (done) {
        //test route for get car in DB
        (0, supertest_1.default)(server_1.default)
            .get('/car/' + _car._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.car;
            (0, chai_1.expect)(userResponse.name).to.equal(_car.name);
            // Done
            done();
        });
    });
    //test route for delete car in DB 
    it('should send back a JSON object for delete car', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/car/' + _car._id)
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

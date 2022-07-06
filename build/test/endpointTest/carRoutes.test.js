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
//create testing for register new car and edit , delete ,get car
describe('server run and crud car', function () {
    //get plate test from DB
    beforeEach(function (done) {
        //find plate by name
        car_1.default.findOne({
            owner: { $in: ['629592546558a38fbecb6d40', '629592546558a38fbecb6e11'] },
            number_plate: { $in: ['1234567', '7654321'] }
        }, (err, car) => {
            if (err) {
                console.log(err);
            }
            _car = car;
            done();
        });
    });
    //test route for register new car in DB
    it('should send back a JSON object with car for create new car', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/api/v1/cars')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            owner: '629592546558a38fbecb6d40',
            number_plate: '1234567',
            brand_id: '629592546558a38fbecb6d40',
            color_id: '629592546558a38fbecb6d40',
            camera_whitelist: ['test']
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'car already exists') {
                let response = res.body.car;
                (0, chai_1.expect)(response.owner.toString()).to.equal('629592546558a38fbecb6d40');
                (0, chai_1.expect)(response.number_plate).to.equal('1234567');
                (0, chai_1.expect)(response.brand_id.toString()).to.equal('629592546558a38fbecb6d40');
                (0, chai_1.expect)(response.color_id.toString()).to.equal('629592546558a38fbecb6d40');
                (0, chai_1.expect)(response.camera_whitelist).to.deep.equal(['test']);
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //test route for get all cars by id from DB
    it('should send back a JSON object for get all cars', function (done) {
        //test route for get cars in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/cars?page=1&perPage=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.cars;
            (0, chai_1.expect)(userResponse[0]).to.have.property('owner');
            (0, chai_1.expect)(userResponse[0]).to.have.property('number_plate');
            (0, chai_1.expect)(userResponse[0]).to.have.property('brand_id');
            (0, chai_1.expect)(userResponse[0]).to.have.property('color_id');
            (0, chai_1.expect)(userResponse[0]).to.have.property('camera_whitelist');
            // Done
            done();
        });
    });
    //test route for search cars by id from DB
    it('should send back a JSON object for search cars', function (done) {
        //test route for get cars in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/cars?page=1&perPage=1&search=12')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.cars;
            (0, chai_1.expect)(userResponse[0].owner.toString()).to.equal('629592546558a38fbecb6d40');
            (0, chai_1.expect)(userResponse[0].number_plate).to.equal('123456');
            (0, chai_1.expect)(userResponse[0].brand_id).to.equal('629592546558a38fbecb6d40');
            (0, chai_1.expect)(userResponse[0].color_id).to.equal('629592546558a38fbecb6d40');
            (0, chai_1.expect)(userResponse[0].camera_whitelist).to.deep.equal(['test']);
            // Done
            done();
        });
    });
    //test route for get car by id from DB
    it('should send back a JSON object for get car with id', function (done) {
        //test route for get car in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/cars/' + _car._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.car;
            (0, chai_1.expect)(userResponse.owner.toString()).to.equal('629592546558a38fbecb6d40');
            (0, chai_1.expect)(userResponse.number_plate).to.equal('1234567');
            (0, chai_1.expect)(userResponse.brand_id.toString()).to.equal('629592546558a38fbecb6d40');
            (0, chai_1.expect)(userResponse.color_id.toString()).to.equal('629592546558a38fbecb6d40');
            (0, chai_1.expect)(userResponse.camera_whitelist).to.deep.equal(['test']);
            // Done
            done();
        });
    });
    //test route for edite car in DB
    it('should send back a JSON object with id for edit car', function (done) {
        let plateEditJson = {
            owner: '629592546558a38fbecb6e11',
            number_plate: '7654321'
        };
        (0, supertest_1.default)(server_1.default)
            .patch('/api/v1/cars/' + _car._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(plateEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let plate = res.body.car;
            (0, chai_1.expect)(plate.owner.toString()).to.equal('629592546558a38fbecb6e11');
            (0, chai_1.expect)(plate.number_plate).to.equal('7654321');
            (0, chai_1.expect)(plate.brand_id.toString()).to.equal(_car.brand_id.toString());
            (0, chai_1.expect)(plate.color_id.toString()).to.equal(_car.color_id.toString());
            (0, chai_1.expect)(plate.camera_whitelist).to.deep.equal(_car.camera_whitelist);
            // Done
            done();
        });
    });
    //test route for delete car in DB 
    it('should send back a JSON object for delete car', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/api/v1/cars/' + _car._id)
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

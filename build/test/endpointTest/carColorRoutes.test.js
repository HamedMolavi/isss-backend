"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const carColor_1 = __importDefault(require("../../models/carColor"));
const token = process.env.sample_token;
let _carColor;
//create testing for register new car_color and edit , delete ,get car_color
describe('server run and crud car color', function () {
    //test route for register new car color in DB
    it('should send back a JSON object with car color for create new car color', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/api/v1/carcolors/')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            name: 'red'
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'Car Color already exists') {
                let response = res.body;
                (0, chai_1.expect)(response.carColor.name).to.equal('red');
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //get car_color test from DB
    beforeEach(function (done) {
        carColor_1.default.findOne({
            name: 'red'
        }, function (err, carColor) {
            if (err) {
                console.log(err);
            }
            _carColor = carColor;
            done();
        });
    });
    //test route for get all car_colors from DB
    it('should send back a JSON object for get all car colors', function (done) {
        //test route for get car_colors in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/carcolors?page=1&perPage=2')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.carColors;
            (0, chai_1.expect)(userResponse[0]).to.have.property('name');
            // Done
            done();
        });
    });
    //test route for search car_colors from DB
    it('should send back a JSON object for search car colors', function (done) {
        //test route for get car_colors in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/carcolors?page=1&perPage=2$search=r')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.carColors;
            (0, chai_1.expect)(userResponse[0]).to.have.property('name');
            // Done
            done();
        });
    });
    //test route for get car_color by id from DB
    it('should send back a JSON object for get car color with id', function (done) {
        //test route for get car_color in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/carcolors/' + _carColor._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.carColor;
            (0, chai_1.expect)(userResponse.name).to.equal(_carColor.name);
            // Done
            done();
        });
    });
    //test route for delete car_color in DB 
    it('should send back a JSON object for delete car color', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/api/v1/carcolors/' + _carColor._id)
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

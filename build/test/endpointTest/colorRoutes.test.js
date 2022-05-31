"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const color_1 = __importDefault(require("../../models/color"));
const token = process.env.sample_token;
let _color;
let _updateColor;
//create testing for register new color and edit , delete ,get color
describe('server run and crud color', function () {
    //test route for register new color in DB
    it('should send back a JSON object with color for create new color', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/color/register')
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
            if (res.body.message !== 'Color already exists') {
                let response = res.body;
                (0, chai_1.expect)(response.color.name).to.equal('red');
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //get color test from DB
    beforeEach(function (done) {
        color_1.default.findOne({
            name: 'red'
        }, function (err, color) {
            if (err) {
                console.log(err);
            }
            _color = color;
            done();
        });
    });
    //test route for get all color from DB
    it('should send back a JSON object for get all color', function (done) {
        //test route for get color in DB
        (0, supertest_1.default)(server_1.default)
            .get('/color/list?page=1&perPage=2')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.colors;
            (0, chai_1.expect)(userResponse[0]).to.have.property('name');
            // Done
            done();
        });
    });
    //test route for get color by id from DB
    it('should send back a JSON object for get color with id', function (done) {
        //test route for get color in DB
        (0, supertest_1.default)(server_1.default)
            .get('/color/' + _color._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.color;
            (0, chai_1.expect)(userResponse.name).to.equal(_color.name);
            // Done
            done();
        });
    });
    //test route for delete color in DB 
    it('should send back a JSON object for delete color', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/color/' + _color._id)
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

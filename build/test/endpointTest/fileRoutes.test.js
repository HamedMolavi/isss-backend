"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const token = process.env.sample_token;
let _file;
describe('test upload , dowloand , get list Image', function () {
    beforeEach(function (done) {
        done();
    });
    //test route for register new user in DB
    it('should send back a JSON object with file name and location and message', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/file/upload')
            .set('Content-Type', 'multipart/form-data')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', './assets/sample/test.jpg')
            .then(function (res) {
            let response = res.body;
            (0, chai_1.expect)(res.status).to.equal(200);
            (0, chai_1.expect)(response).to.have.property('name');
            (0, chai_1.expect)(response).to.have.property('location');
            (0, chai_1.expect)(response).to.have.property('message');
            done();
        });
    });
    //test route for register new user in DB
    it('should send back a image picture', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get('/file/download/test.jpg')
            .set('Content-Type', 'multipart/form-data')
            .set('Authorization', `Bearer ${token}`)
            .then(function (res) {
            (0, chai_1.expect)(res.status).to.equal(200);
            done();
        });
    });
});

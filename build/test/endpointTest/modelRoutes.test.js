"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const model_1 = __importDefault(require("../../models/model"));
const token = process.env.sample_token;
let _model;
//create testing for get model
describe('server run and get model', function () {
    //get model test from DB
    beforeEach(function (done) {
        model_1.default.findOne({
            category: { $in: ['fire'] }
        }, function (err, model) {
            if (err) {
                console.log(err);
            }
            _model = model;
            done();
        });
    });
    //test route for get model by id from DB
    it('should send back a JSON object for get model with category', function (done) {
        //test route for get model in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/models/' + _model.category)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.model;
            (0, chai_1.expect)(userResponse.category).to.equal(_model.category);
            (0, chai_1.expect)(userResponse.name).to.equal(_model.name);
            (0, chai_1.expect)(userResponse.uri).to.equal(_model.uri);
            // Done
            done();
        });
    });
});

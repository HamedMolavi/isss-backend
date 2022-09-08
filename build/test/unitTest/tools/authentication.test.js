"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const authentication_1 = require("./../../../tools/authentication");
const dotenv_1 = __importDefault(require("dotenv"));
//add variable from .env 
dotenv_1.default.config();
//load sample_token from .env
let token = process.env['sample_token'];
//test function Authentication with token 
describe('Authentication', function () {
    describe('#authorize()', function () {
        //load function and get response and compare to following value
        it('should return jason for authentication authorize critential', function (done) {
            let result = (0, authentication_1.authorize)(token);
            (0, chai_1.expect)(result).to.be.an('object');
            (0, chai_1.expect)(result).to.have.property('id');
            (0, chai_1.expect)(result).to.have.property('role');
            (0, chai_1.expect)(result).to.have.property('exp');
            (0, chai_1.expect)(result).to.have.property('iat');
            done();
        });
    });
    //test function getTokenAndVerify  for token is valid and return value
    describe('#getTokenAndVerify()', function () {
        //load function and get response and compare to following value
        it('should return token for authentication getTokenAndVerify', function (done) {
            let result = (0, authentication_1.authorize)(token);
            (0, chai_1.expect)(result).to.be.an('object');
            (0, chai_1.expect)(result).to.have.property('id');
            (0, chai_1.expect)(result).to.have.property('role');
            (0, chai_1.expect)(result).to.have.property('exp');
            (0, chai_1.expect)(result).to.have.property('iat');
            done();
        }); //timeout for test
    });
});

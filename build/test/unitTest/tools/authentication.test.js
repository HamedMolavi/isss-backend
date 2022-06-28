"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const authentication_1 = require("./../../../tools/authentication");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
let token = process.env['sample_token'];
describe('Authentication', function () {
    describe('#authorize()', function () {
        console.log(token);
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
    describe('#getTokenAndVerify()', function () {
        it('should return token for authentication getTokenAndVerify', function (done) {
            let result = (0, authentication_1.authorize)(token);
            (0, chai_1.expect)(result).to.be.an('object');
            (0, chai_1.expect)(result).to.have.property('id');
            (0, chai_1.expect)(result).to.have.property('role');
            (0, chai_1.expect)(result).to.have.property('exp');
            (0, chai_1.expect)(result).to.have.property('iat');
            done();
        }).timeout(10000);
    });
});

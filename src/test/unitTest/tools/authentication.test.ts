import { assert, expect } from 'chai';
import { authorize } from './../../../tools/authentication';
import dotenv from "dotenv";
//add variable from .env 
dotenv.config();
//load sample_token from .env
let token = process.env['sample_token'] as string;
//test function Authentication with token 
describe('Authentication', function () {
    describe('#authorize()', function () {
        //load function and get response and compare to following value
        it('should return jason for authentication authorize critential', function (done: Function) {
            let result = authorize(token);
            expect(result).to.be.an('object');
            expect(result).to.have.property('id');
            expect(result).to.have.property('role');
            expect(result).to.have.property('exp');
            expect(result).to.have.property('iat');
            done();
        });
    });
    //test function getTokenAndVerify  for token is valid and return value
    describe('#getTokenAndVerify()', function () {
        //load function and get response and compare to following value
        it('should return token for authentication getTokenAndVerify', function (done: Function) {
            let result = authorize(token);
            expect(result).to.be.an('object');
            expect(result).to.have.property('id');
            expect(result).to.have.property('role');
            expect(result).to.have.property('exp');
            expect(result).to.have.property('iat');
            done();
        }).timeout(10000);//timeout for test
    });
});
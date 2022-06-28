import { assert, expect } from 'chai';
import { authorize } from './../../../tools/authentication';
import dotenv from "dotenv";

dotenv.config();
let token = process.env['sample_token'] as string;

describe('Authentication', function () {
    describe('#authorize()', function () {
        console.log(token);
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

    describe('#getTokenAndVerify()', function () {
        it('should return token for authentication getTokenAndVerify', function (done: Function) {
            let result = authorize(token);
            expect(result).to.be.an('object');
            expect(result).to.have.property('id');
            expect(result).to.have.property('role');
            expect(result).to.have.property('exp');
            expect(result).to.have.property('iat');
            done();
        }).timeout(10000);
    });
});
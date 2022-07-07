"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const reverseString_1 = __importDefault(require("./../../../tools/reverseString"));
//test function reverseString
describe('Reverse String', function () {
    //load function and get response and compare to following value
    describe('#reverseString()', function () {
        it('should return string for reverse string', function () {
            chai_1.assert.isString((0, reverseString_1.default)('10.12.2022'));
            chai_1.assert.isNotEmpty((0, reverseString_1.default)('10.12.2022'));
            chai_1.assert.isNotNull((0, reverseString_1.default)('10.12.2022'));
            chai_1.assert.equal((0, reverseString_1.default)('10.12.2022'), '2022-12-10');
        });
    });
});

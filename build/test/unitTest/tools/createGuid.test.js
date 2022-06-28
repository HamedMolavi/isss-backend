"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const createGuid_1 = __importDefault(require("./../../../tools/createGuid"));
describe('Create GUID', function () {
    describe('#newGuid()', function () {
        it('should return string for create new guid', function () {
            chai_1.assert.isString(createGuid_1.default.newGuid());
            chai_1.assert.isNotEmpty(createGuid_1.default.newGuid());
            chai_1.assert.isNotNull(createGuid_1.default.newGuid());
        });
    });
});

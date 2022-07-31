"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const verifyPasswordRegex_1 = require("../../../tools/verifyPasswordRegex");
//test function password veify with regex
describe("password veify with regex", function () {
    //load function and get response and compare to following value
    describe("#password veify getStrength()", function () {
        it("should return number if number > 99 password is verify", function () {
            let password = "12345678";
            let result = (0, verifyPasswordRegex_1.getStrength)(password);
            chai_1.assert.isNumber(result);
            chai_1.assert.isBelow(result, 99);
            password = "Ariapa1401@#";
            result = (0, verifyPasswordRegex_1.getStrength)(password);
            chai_1.assert.isNumber(result);
            chai_1.assert.isAbove(result, 99);
        });
    });
});

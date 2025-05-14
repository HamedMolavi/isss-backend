import { assert } from 'chai';
import reverseString from './../../../tools/reverseString';
//test function reverseString
describe('Reverse String', function () {
    //load function and get response and compare to following value
    describe('#reverseString()', function () {
        it('should return string for reverse string', function () {
            assert.isString(reverseString('12/10/2022'));
            assert.isNotEmpty(reverseString('12/10/2022'));
            assert.isNotNull(reverseString('12/10/2022'));
            assert.equal(reverseString('12/10/2022'), '2022-12-10');
        });
    });
});
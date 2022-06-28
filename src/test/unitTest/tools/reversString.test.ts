import { assert } from 'chai';
import reverseString from './../../../tools/reverseString';

describe('Reverse String', function () {
    describe('#reverseString()', function () {
        it('should return string for reverse string', function () {
            assert.isString(reverseString('10.12.2022'));
            assert.isNotEmpty(reverseString('10.12.2022'));
            assert.isNotNull(reverseString('10.12.2022'));
            assert.equal(reverseString('10.12.2022'), '2022-12-10');
        });
    });
});
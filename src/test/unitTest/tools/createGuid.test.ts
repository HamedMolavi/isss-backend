import { assert } from 'chai';
import { Guid } from './../../../tools/util.tools';
//test function createGuid
describe('Create GUID', function () {
    //load function and get response and compare to following value
    describe('#newGuid()', function () {
        it('should return string for create new guid', function () {
            assert.isString(Guid.newGuid());
            assert.isNotEmpty(Guid.newGuid());
            assert.isNotNull(Guid.newGuid());
        });
    });
});
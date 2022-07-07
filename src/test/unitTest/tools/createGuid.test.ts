import { assert } from 'chai';
import guid from './../../../tools/createGuid';
//test function createGuid
describe('Create GUID', function () {
    //load function and get response and compare to following value
    describe('#newGuid()', function () {
        it('should return string for create new guid', function () {
            assert.isString(guid.newGuid());
            assert.isNotEmpty(guid.newGuid());
            assert.isNotNull(guid.newGuid());
        });
    });
});
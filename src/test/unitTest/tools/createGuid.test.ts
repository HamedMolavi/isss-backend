import { assert } from 'chai';
import guid from './../../../tools/createGuid';

describe('Create GUID', function () {
    describe('#newGuid()', function () {
        it('should return string for create new guid', function () {
            assert.isString(guid.newGuid());
            assert.isNotEmpty(guid.newGuid());
            assert.isNotNull(guid.newGuid());
        });
    });
});
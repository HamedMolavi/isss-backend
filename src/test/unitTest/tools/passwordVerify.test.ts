import { assert } from 'chai';
import { getStrength } from '../../../tools/password.tools';

//test function password veify with regex
describe('password veify with regex', function () {
	//load function and get response and compare to following value
	describe('#password veify getStrength()', function () {
		it('should return number if number > 99 password is verify', function () {
			let password = '12345678';
			let result = getStrength(password);
			assert.isNumber(result);
			assert.isBelow(result, 99);

			password = 'Ariapa1401@#';
			result = getStrength(password);
			assert.isNumber(result);
			assert.isAbove(result, 99);
		});
	});
});

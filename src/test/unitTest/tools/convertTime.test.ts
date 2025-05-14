import { expect } from 'chai';
import Time from '../../../tools/time.tools';
import { Clock } from '../../../types/interfaces/time.interface';
//test function Time.toCron
describe('Time.toCron', () => {
	//load function and get response and compare to following value
	it('should convert time to cron format', () => {
		let time: Clock = '10:00';
		let result = Time.toCron(time);
		expect(result).to.equal('00 10 * * ');
		let result2 = Time.toCronDay('00 10 * * ', '2');
		expect(result2).to.equal('00 10 * * 2');
	});
});
//test function compareTime
describe('compareTime', () => {
	//load function and get response and compare to following value
	it('should compare time', () => {
		let start: Clock = '10:00';
		let stop: Clock = '11:00';
		let result = Time.compareTime(start, stop);
		expect(result).to.equal(true);
		let start2: Clock = '10:00';
		let stop2: Clock = '10:01';
		let result2 = Time.compareTime(start2, stop2);
		expect(result2).to.equal(true);
		let start3: Clock = '11:00';
		let stop3: Clock = '10:01';
		let result3 = Time.compareTime(start3, stop3);
		expect(result3).to.equal(false);
	}); //timeout for test
});

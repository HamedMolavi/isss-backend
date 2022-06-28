import { expect } from 'chai';
import { convertToCron, compareTime, convertToCronDay } from './../../../tools/convertTime';

describe('convertToCron', () => {
    it('should convert time to cron format', () => {
        let time = '10:00';
        let result = convertToCron(time);
        expect(result).to.equal('00 10 * * ');
        let result2 = convertToCronDay('00 10 * * ', (2).toString());
        expect(result2).to.equal('00 10 * * 2');
    });
});

describe('compareTime', () => {
    it('should compare time', () => {
        let start = '10:00';
        let stop = '11:00';
        let result = compareTime(start, stop);
        expect(result).to.equal(true);
        let start2 = '10:00';
        let stop2 = '10:01';
        let result2 = compareTime(start2, stop2);
        expect(result2).to.equal(true);
        let start3 = '11:00';
        let stop3 = '10:01';
        let result3 = compareTime(start3, stop3);
        expect(result3).to.equal(false);
    }).timeout(5000);
});
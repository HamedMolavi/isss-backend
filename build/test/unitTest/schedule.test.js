"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connect_1 = require("../../db/connect");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../../server");
//test Schedule models
describe('Schedule', function () {
    let Schedule;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once('connected', () => {
            mongoose_1.default.connection.db.dropDatabase();
            require('../../models/schedule').registerModels;
            // This is the right model because registerModels set it up for us.
            Schedule = mongoose_1.default.model('Schedule');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        (0, connect_1.Disconnect)();
        done();
    });
    //test Schedule model
    describe('register Schedule', function () {
        //create Schedule model
        it('should save Schedule in DB', function (done) {
            var schedule = new Schedule({
                start_cron: '00 10 * * 1',
                stop_cron: '00 12 * * 1',
                model_camera_id: new mongoose_1.default.Types.ObjectId('6283724be1996b883080a495'),
                config: {
                    threshold: 0,
                    zones: [[0, 0, 0, 0], [2, 3, 5, 2]],
                    min_people: 1,
                    max_people: 2
                }
            });
            //test this AI model
            schedule.save().then(() => {
                (0, chai_1.expect)(schedule.start_cron).to.equal('00 10 * * 1');
                (0, chai_1.expect)(schedule.stop_cron).to.equal('00 12 * * 1');
                (0, chai_1.expect)(schedule.model_camera_id.toString()).to.equal('6283724be1996b883080a495');
                (0, chai_1.expect)(schedule.config.threshold).to.equal(0);
                (0, chai_1.expect)(schedule.config.zones).to.deep.equal([[0, 0, 0, 0], [2, 3, 5, 2]]);
                (0, chai_1.expect)(schedule.config.min_people).to.equal(1);
                (0, chai_1.expect)(schedule.config.max_people).to.equal(2);
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
});

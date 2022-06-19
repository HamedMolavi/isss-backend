"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const schedule_1 = __importDefault(require("../../models/schedule"));
const token = process.env.sample_token;
let _schedule;
let _updateSchedule;
//create testing for register new schedule and edit , delete ,get schedule
describe('server run and crud schedule', function () {
    //test route for register new schedule in DB
    it('should send back a JSON object with schedule for create new schedule', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/api/v1/schedules/')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            start: "10:00",
            stop: "12:00",
            dayOfWeek: "1",
            model_camera_id: "6283724be1996b883080a495",
            montionDetection: true,
            threshold: 85,
            zones: [[0, 0, 0, 0], [2, 3, 5, 2]],
            min_people: 1,
            max_people: 2
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== "schedule already exist") {
                let response = res.body.schedule;
                (0, chai_1.expect)(response.start_cron).to.equal('00 10 * * 1');
                (0, chai_1.expect)(response.stop_cron).to.equal('00 12 * * 1');
                (0, chai_1.expect)(response.model_camera_id).to.equal('6283724be1996b883080a495');
                (0, chai_1.expect)(response.config.threshold).to.equal(85);
                (0, chai_1.expect)(response.config.zones).to.deep.equal([[0, 0, 0, 0], [2, 3, 5, 2]]);
                (0, chai_1.expect)(response.config.min_people).to.equal(1);
                (0, chai_1.expect)(response.config.max_people).to.equal(2);
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    //get schedule test from DB
    beforeEach(function (done) {
        schedule_1.default.findOne({
            //  $or: [
            start_cron: { $in: ['00 10 * * 1', '00 8 * * 1'] }
            //  
        }, function (err, schedule) {
            if (err) {
                console.log(err);
            }
            _schedule = schedule;
            done();
        });
    });
    //test route for get all schedule from DB
    it('should send back a JSON object for get all schedule', function (done) {
        //test route for get schedule in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/schedules?PerPage=2&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.schedules;
            (0, chai_1.expect)(userResponse[0].start_cron).to.equal('00 10 * * 1');
            (0, chai_1.expect)(userResponse[0].stop_cron).to.equal('00 12 * * 1');
            (0, chai_1.expect)(userResponse[0].model_camera_id).to.equal('6283724be1996b883080a495');
            (0, chai_1.expect)(userResponse[0].config.threshold).to.equal(85);
            (0, chai_1.expect)(userResponse[0].config.zones).to.deep.equal([[0, 0, 0, 0], [2, 3, 5, 2]]);
            (0, chai_1.expect)(userResponse[0].config.min_people).to.equal(1);
            (0, chai_1.expect)(userResponse[0].config.max_people).to.equal(2);
            // Done
            done();
        });
    });
    //test route for get schedule by id from DB
    it('should send back a JSON object for get schedule with id', function (done) {
        //test route for get schedule in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/schedules/' + _schedule._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.schedule;
            (0, chai_1.expect)(userResponse.start_cron).to.equal('00 10 * * 1');
            (0, chai_1.expect)(userResponse.stop_cron).to.equal('00 12 * * 1');
            (0, chai_1.expect)(userResponse.model_camera_id).to.equal('6283724be1996b883080a495');
            (0, chai_1.expect)(userResponse.config.threshold).to.equal(85);
            (0, chai_1.expect)(userResponse.config.zones).to.deep.equal([[0, 0, 0, 0], [2, 3, 5, 2]]);
            (0, chai_1.expect)(userResponse.config.min_people).to.equal(1);
            (0, chai_1.expect)(userResponse.config.max_people).to.equal(2);
            // Done
            done();
        });
    });
    //test route for edite schedule in DB
    it('should send back a JSON object with id for edit schedule', function (done) {
        let scheduleEditJson = {
            start_cron: '00 8 * * 1',
            stop_cron: '00 9 * * 1',
        };
        (0, supertest_1.default)(server_1.default)
            .patch('/api/v1/schedules/' + _schedule._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(scheduleEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let schedule = res.body.schedule;
            (0, chai_1.expect)(schedule.start_cron).to.equal('00 8 * * 1');
            (0, chai_1.expect)(schedule.stop_cron).to.equal('00 9 * * 1');
            (0, chai_1.expect)(schedule.model_camera_id).to.equal('6283724be1996b883080a495');
            (0, chai_1.expect)(schedule.config.threshold).to.equal(85);
            (0, chai_1.expect)(schedule.config.zones).to.deep.equal([[0, 0, 0, 0], [2, 3, 5, 2]]);
            (0, chai_1.expect)(schedule.config.min_people).to.equal(1);
            (0, chai_1.expect)(schedule.config.max_people).to.equal(2);
            // Done
            done();
        });
    });
    //test route for delete schedule in DB 
    it('should send back a JSON object for delete schedule', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/api/v1/schedules/' + _schedule._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let result = res.body;
            (0, chai_1.expect)(result.message).to.equal("Success");
            // Done
            done();
        });
    });
});

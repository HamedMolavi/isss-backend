import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import Schedule, { ISchedule } from '../../models/schedule';


const token = process.env.sample_token;
let _schedule: ISchedule;
let _updateSchedule: ISchedule;

//create testing for register new schedule and edit , delete ,get schedule
describe('server run and crud schedule', function () {

    //test route for register new schedule in DB
    it('should send back a JSON object with schedule for create new schedule', function (done) {
        request(app)
            .post('/api/v1/schedules/')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                start: "10:00",
                stop: "12:00",
                dayOfWeek: "1",
                model_id: "628dcf08f014bc89f0280c60",
                camera_id: "628dcf08f014bc89f0280c60",
                montionDetection: true,
                threshold: 85,
                zones: [[0, 0, 0, 0], [2, 3, 5, 2]],
                min_people: 1,
                max_people: 2
            })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                if (res.body.message !== "schedule already exist") {
                    let response = res.body.data;
                    expect(response.start_cron).to.equal('00 10 * * 1');
                    expect(response.stop_cron).to.equal('00 12 * * 1');
                    expect(response.model_camera_id).to.be.an('String');
                    expect(response.config.threshold).to.equal(85);
                    expect(response.config.zones).to.deep.equal([[0, 0, 0, 0], [2, 3, 5, 2]]);
                    expect(response.config.min_people).to.equal(1);
                    expect(response.config.max_people).to.equal(2);

                } else {
                    let response = null;
                }
                // Done
                done();
            });
    });

    //get schedule test from DB
    beforeEach(function (done) {

        Schedule.findOne({
            //  $or: [
            start_cron: { $in: ['00 10 * * 1', '00 8 * * 1'] }
            //  
        }, function (err: Error, schedule: ISchedule) {
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
        request(app)
            .get('/api/v1/schedules?PerPage=2&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.data;
                expect(userResponse[0].start_cron).to.equal('00 10 * * 1');
                expect(userResponse[0].stop_cron).to.equal('00 12 * * 1');
                expect(userResponse[0].model_camera_id).to.be.an('String');
                expect(userResponse[0].config.threshold).to.equal(85);
                expect(userResponse[0].config.zones).to.deep.equal([[0, 0, 0, 0], [2, 3, 5, 2]]);
                expect(userResponse[0].config.min_people).to.equal(1);
                expect(userResponse[0].config.max_people).to.equal(2);
                // Done
                done();
            });
    });


    //test route for get schedule by id from DB
    it('should send back a JSON object for get schedule with id', function (done) {

        //test route for get schedule in DB
        request(app)
            .get('/api/v1/schedules/' + _schedule._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.schedule;
                expect(userResponse.start_cron).to.equal('00 10 * * 1');
                expect(userResponse.stop_cron).to.equal('00 12 * * 1');
                expect(userResponse.model_camera_id).to.be.an('String');
                expect(userResponse.config.threshold).to.equal(85);
                expect(userResponse.config.zones).to.deep.equal([[0, 0, 0, 0], [2, 3, 5, 2]]);
                expect(userResponse.config.min_people).to.equal(1);
                expect(userResponse.config.max_people).to.equal(2);
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
        request(app)
            .patch('/api/v1/schedules/' + _schedule._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(scheduleEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let schedule = res.body.schedule;
                expect(schedule.start_cron).to.equal('00 8 * * 1');
                expect(schedule.stop_cron).to.equal('00 9 * * 1');
                expect(schedule.model_camera_id).to.be.an('String');
                expect(schedule.config.threshold).to.equal(85);
                expect(schedule.config.zones).to.deep.equal([[0, 0, 0, 0], [2, 3, 5, 2]]);
                expect(schedule.config.min_people).to.equal(1);
                expect(schedule.config.max_people).to.equal(2);
                // Done
                done();
            });
    });


    //test route for delete schedule in DB 
    it('should send back a JSON object for delete schedule', function (done) {

        request(app)
            .delete('/api/v1/schedules/' + _schedule._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let result = res.body;
                expect(result.message).to.equal("Success");
                // Done
                done();
            });
    });

});








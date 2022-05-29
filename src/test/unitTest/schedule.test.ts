import { expect } from 'chai';
import { Disconnect } from '../../db/connect';
import mongoose from 'mongoose';
import { dbUri } from '../../server';


//test Schedule models
describe('Schedule', function () {

    let Schedule: any;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose.connect(dbUri);
        //listen for connection events
        mongoose.connection.once('connected', () => {
            mongoose.connection.db.dropDatabase();

            require('../../models/schedule').registerModels;
            // This is the right model because registerModels set it up for us.
            Schedule = mongoose.model('Schedule');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        Disconnect();
        done();
    });
    //test Schedule model
    describe('register Schedule', function () {
        //create Schedule model
        it('should save Schedule in DB', function (done) {
            var schedule = new Schedule({
                start_cron: '* * * * *',
                stop_cron: '* * * * *',
                model_camera_id:new mongoose.Types.ObjectId('6283724be1996b883080a495'),
                config: {
                    threshold: 0,
                    zones: [[0, 0, 0, 0],[2, 3, 5, 2]]
                }
            });
            //test this AI model
            schedule.save().then(() => {

                expect(schedule.start_cron).to.equal('* * * * *');
                expect(schedule.stop_cron).to.equal('* * * * *');
                expect(schedule.model_camera_id.toString()).to.equal('6283724be1996b883080a495');
                expect(schedule.config.threshold).to.equal(0);
                expect(schedule.config.zones).to.deep.equal([[0, 0, 0, 0],[2, 3, 5, 2]]);

                done();
            }
            ).catch((err: Error) => {
                done(err);
            });
        });

    });
});
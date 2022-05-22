import { expect } from 'chai';
import { Disconnect } from '../../db/connect';
import mongoose from 'mongoose';
import { dbUri } from '../../server';


//test AI models
describe('AI', function () {

    let AI: any;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose.connect(dbUri);
        //listen for connection events
        mongoose.connection.once('connected', () => {
            mongoose.connection.db.dropDatabase();

            require('../../models/AI').registerModels;
            // This is the right model because registerModels set it up for us.
            AI = mongoose.model('AI');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        Disconnect();
        done();
    });
    //test AI model
    describe('register AI', function () {
        //create AI model
        it('should save AI in DB', function (done) {
            var ai = new AI({
                start: "2019-01-01T00:00:00.000Z",
                end: "2019-01-01T00:00:00.000Z",
                thresholdid : 85,
                minTime : "2019-01-01T00:00:00.000Z",
                zone : ["zone1", "zone2"],
                type : "type1",
                minPeople : 1,
                maxPeople : 2
            });
            //test this AI model
            ai.save().then(() => {
                expect(ai.start).to.equal("2019-01-01T00:00:00.000Z");
                expect(ai.end).to.equal("2019-01-01T00:00:00.000Z");
                expect(ai.thresholdid).to.equal(85);
                expect(ai.minTime).to.equal("2019-01-01T00:00:00.000Z");
                expect(ai.zone[0]).to.equal("zone1");
                expect(ai.type).to.equal("type1");
                expect(ai.minPeople).to.equal(1);
                expect(ai.maxPeople).to.equal(2);
               
                done();
            }
            ).catch((err: Error) => {
                done(err);
            });
        });

    });
});
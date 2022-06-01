import { expect } from 'chai';
import { Disconnect } from '../../db/connectMongo';
import mongoose from 'mongoose';
import { dbUri } from '../../server';

//test jobTitle models
describe('jobTitle model', function () {

    let JobTitle: any;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose.connect(dbUri);
        //listen for connection events
        mongoose.connection.once('connected', () => {
            mongoose.connection.db.dropDatabase();
            require('../../models/jobTitle').registerModels;
            // This is the right model because ^registerModels set it up for us.
            JobTitle = mongoose.model('JobTitle');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        Disconnect();
        done();
    });
    //test jobTitle model
    describe('register jobTitle', function () {
        //create jobTitle model
        it('should save jobTitle in db', function (done) {
            var jobTitle = new JobTitle({
                name: 'developer',
            });
            //test this jobTitle model
            jobTitle.save().then(() => {
                expect(jobTitle.name).to.equal('developer');
                done();
            }
            ).catch((err: Error) => {
                done(err);
            });
        });

    });
});
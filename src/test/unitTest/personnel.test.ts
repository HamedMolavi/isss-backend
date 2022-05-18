import { expect } from 'chai';
import { Disconnect } from '../../db/connect';
import mongoose from 'mongoose';
import { dbUri } from '../../server';

//test personnel models
describe('personnel', function () {

    let Personnel: any;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose.connect(dbUri);
        //listen for connection events
        mongoose.connection.once('connected', () => {
            mongoose.connection.db.dropDatabase();

            require('../../models/personnel').registerModels;
            // This is the right model because registerModels set it up for us.
            Personnel = mongoose.model('Personnel');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        Disconnect();
        done();
    });
    //test personnel model
    describe('register personnel', function () {
        //create personnel model
        it('should save personnel in db', function (done) {
            var personnel = new Personnel({
                name: 'jack',
                family: 'jackson',
                phone: '123456789',
                jobTitle: new mongoose.Types.ObjectId('6283724be1996b883080a495')
            });
            //test this personnel model
            personnel.save().then(() => {
                expect(personnel.name).to.equal('jack');
                expect(personnel.family).to.equal('jackson');
                expect(personnel.phone).to.equal('123456789');

                done();
            }).catch((err: Error) => {
                done(err);
            });
        });

    });
});
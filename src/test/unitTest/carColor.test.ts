import { expect } from 'chai';
import { Disconnect } from '../../db/connectMongo';
import mongoose from 'mongoose';
import { dbUri } from '../../server';

//test color models
describe('car color', function () {

    let Color: any;
    //connect to DB before test
    before(function (done) {
        //connect to DB
        mongoose.connect(dbUri);
        //listen for connection events
        mongoose.connection.once('connected', () => {
            mongoose.connection.db.dropDatabase().then(() => {
                require('../../models/carColor').registerModels;
                // This is the right model because register Models set it up for us.
                Color = mongoose.model('Car_Color');
                done();
            }).catch((err: Error) => {
                done(err);
            });
        });
    });
    //disconnect from DB after test
    after(function (done) {
        Disconnect();
        done();
    });
    //test color model
    describe('register color', function () {
        //create color model
        it('should save color in db', function (done) {
            var color = new Color({
                name: 'red',
            });
            //test this color model
            color.save().then(() => {
                expect(color.name).to.equal('red');
                done();
            }
            ).catch((err: Error) => {
                done(err);
            });
        });

    });
});
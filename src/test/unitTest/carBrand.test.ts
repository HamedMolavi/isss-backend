import { expect } from 'chai';
import { Disconnect } from '../../db/connectMongo';
import mongoose from 'mongoose';
import { dbUri } from '../../server';

//test car models
describe('car Brand', function () {

    let Car: any;
    //connect to DB before test
    before(function (done) {
        //connect to DB
        mongoose.connect(dbUri);
        //listen for connection events
        mongoose.connection.once('connected', () => {
            mongoose.connection.db.dropDatabase().then(() => {
                require('../../models/carBrand').registerModels;
                // This is the right model because register Models set it up for us.
                Car = mongoose.model('Car_Brand');
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
    //test car model
    describe('register car', function () {
        //create car model
        it('should save car in db', function (done) {
            var car = new Car({
                name: 'pride',
            });
            //test this car model
            car.save().then(() => {
                expect(car.name).to.equal('pride');
                done();
            }
            ).catch((err: Error) => {
                done(err);
            });
        });

    });
});
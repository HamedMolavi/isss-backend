import { expect } from 'chai';
import { Disconnect } from '../../db/connectMongo';
import mongoose from 'mongoose';
import { dbUri } from '../../server';

//test car models
describe('car', function () {

    let Car: any;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose.connect(dbUri);
        //listen for connection events
        mongoose.connection.once('connected', () => {
            mongoose.connection.db.dropDatabase();

            require('../../models/car').registerModels;
            // This is the right model because registerModels set it up for us.
            Car = mongoose.model('Car');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        Disconnect();
        done();
    });
    //test car model
    describe('register car', function () {
        //create car model
        it('should save car in db', function (done) {
            var car = new Car({
                owner: "test",
                number_plate: "123456",
                brand_id: "629592546558a38fbecb6d40",
                color_id: "629592546558a38fbecb6d40",
                camera_whitelist: [
                    "629592546558a38fbecb6d40"
                ]
            });
            //test this car model
            car.save().then(() => {
                expect(car.owner).to.equal('test');
                expect(car.number_plate).to.equal('123456');
                expect(car.brand_id.toString()).to.equal('629592546558a38fbecb6d40');
                expect(car.color_id.toString()).to.equal('629592546558a38fbecb6d40');
                expect(car.camera_whitelist).to.deep.equal(['629592546558a38fbecb6d40']);

                done();
            }).catch((err: Error) => {
                done(err);
            });
        });

    });
});
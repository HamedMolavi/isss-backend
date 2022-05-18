import { expect } from 'chai';
import { Disconnect } from '../../db/connect';
import mongoose from 'mongoose';
import { dbUri } from '../../server';

//test plate models
describe('plate', function () {

    let Plate: any;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose.connect(dbUri);
        //listen for connection events
        mongoose.connection.once('connected', () => {
            mongoose.connection.db.dropDatabase();

            require('../../models/plate').registerModels;
            // This is the right model because registerModels set it up for us.
            Plate = mongoose.model('Plate');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        Disconnect();
        done();
    });
    //test plate model
    describe('register plate', function () {
        //create plate model
        it('should save plate in db', function (done) {
            var plate = new Plate({
                number: '12345',
                carBrand: 'BMW',
                color: 'red',
                owner: 'John'
            });
            //test this plate model
            plate.save().then(() => {
                expect(plate.number).to.equal('12345');
                expect(plate.carBrand).to.equal('BMW');
                expect(plate.color).to.equal('red');

                done();
            }).catch((err: Error) => {
                done(err);
            });
        });

    });
});
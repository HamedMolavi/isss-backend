import { expect } from 'chai';
import { Disconnect } from '../../db/connect';
import mongoose from 'mongoose';
import { dbUri } from '../../server';

//test section models
describe('departement', function () {

    let Departement: any;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose.connect(dbUri,{ authSource: 'admin' });
        //listen for connection events
        mongoose.connection.once('connected', () => {
          //  mongoose.connection.db.dropDatabase();

            require('../../models/departement').registerModels;
            // This is the right model because ^registerModels set it up for us.
            Departement = mongoose.model('Departement');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        Disconnect();
        done();
    });
    //test departement model
    describe('register departement', function () {
        //create departement model
        it('should save user in db', function (done) {
            var departement = new Departement({
                name: 'offece',
                created_date: new Date()
            });
            //test this departement model
            departement.save().then(() => {
                expect(departement.name).to.equal('offece');
                done();
            }
            ).catch((err: Error) => {
                done(err);
            });
        });

    });
});
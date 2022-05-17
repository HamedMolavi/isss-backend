import { expect } from 'chai';
import { Disconnect } from '../../db/connect';
import mongoose from 'mongoose';
import { dbUri } from '../../server';

//test camera models
describe('camera', function () {

    let Camera: any;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose.connect(dbUri);
        //listen for connection events
        mongoose.connection.once('connected', () => {
            mongoose.connection.db.dropDatabase();

            require('../../models/camera').registerModels;
            // This is the right model because ^registerModels set it up for us.
            Camera = mongoose.model('Camera');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        Disconnect();
        done();
    });
    //test camera model
    describe('register camera', function () {
        //create camera model
        it('should save user in db', function (done) {
            var camera = new Camera({
                ip: '172.10.10.1',
                name: 'offece',
                username: 'test',
                password: '12345',
                rstpLink: 'rtsp://192.168.1.111:554/media/video1'
            });
            //test this camera model
            camera.save().then(() => {
                expect(camera.ip).to.equal('172.10.10.1');
                expect(camera.name).to.equal('offece');
                expect(camera.username).to.equal('test');
                expect(camera.password).to.equal('12345');
                expect(camera.rstpLink).to.equal('rtsp://192.168.1.111:554/media/video1');
                done();
            }
            ).catch((err: Error) => {
                done(err);
            });
        });

    });
});
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
                network: '172.10.10.1',
                name: 'office',
                section_id: new mongoose.Types.ObjectId('6283724be1996b883080a495'),
                departement_id: new mongoose.Types.ObjectId('6283724be1996b883080a495'),
                url: 'rtsp://192.168.1.111:554/media/video1',
                ip: '172.10.10.1',
                username: 'test',
                password: '12345',
                is_enabled: true
            });
            //test this camera model
            camera.save().then(() => {
                expect(camera.network).to.equal('172.10.10.1');
                expect(camera.name).to.equal('office');
                expect(camera.section_id.toString()).to.equal('6283724be1996b883080a495');
                expect(camera.departement_id.toString()).to.equal('6283724be1996b883080a495');
                expect(camera.url).to.equal('rtsp://192.168.1.111:554/media/video1');
                expect(camera.ip).to.equal('172.10.10.1');
                expect(camera.username).to.equal('test');
                expect(camera.password).to.equal('12345');
                expect(camera.is_enabled).to.equal(true);
                done();
            }
            ).catch((err: Error) => {
                done(err);
            });
        });

    });
});
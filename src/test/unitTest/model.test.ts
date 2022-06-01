import { expect } from 'chai';
import { Disconnect } from '../../db/connectMongo';
import mongoose from 'mongoose';
import { dbUri } from '../../server';

//test  models model
describe('model', function () {

    let Model: any;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose.connect(dbUri);
        //listen for connection events
        mongoose.connection.once('connected', () => {
            mongoose.connection.db.dropDatabase();

            require('../../models/model').registerModels;
            // This is the right model because register Models set it up for us.
            Model = mongoose.model('Model');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        Disconnect();
        done();
    });
    //test model
    describe('register model', function () {
        //create model model
        it('should save model in db', function (done) {
            var model = new Model({
                name: 'yolov5s',
                category: 'fire',
                uri: '/home/mohsen/PycharmProjects/HD/HumanDetectionPackage/FirePredictor/Models/FD_yolov5s.onnx'
            });
            //test this model
            model.save().then(() => {
                expect(model.name).to.equal('yolov5s');
                expect(model.category).to.equal('fire');
                expect(model.uri).to.equal('/home/mohsen/PycharmProjects/HD/HumanDetectionPackage/FirePredictor/Models/FD_yolov5s.onnx');
                done();
            }
            ).catch((err: Error) => {
                done(err);
            });
        });

    });
});
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connect_1 = require("../../db/connect");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../../server");
//test user models
describe('Models', function () {
    let Camera;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once('connected', () => {
            mongoose_1.default.connection.db.dropDatabase();
            require('../../models/camera').registerModels;
            // This is the right model because ^registerModels set it up for us.
            Camera = mongoose_1.default.model('Camera');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        (0, connect_1.Disconnect)();
        done();
    });
    //test user model
    describe('register camera', function () {
        it('should save user in db', function (done) {
            var camera = new Camera({
                ip: '172.10.10.1',
                name: 'offece',
                username: 'test',
                password: '12345',
                rstpLink: 'rtsp://192.168.1.111:554/media/video1'
            });
            camera.save().then(() => {
                (0, chai_1.expect)(camera.ip).to.equal('172.10.10.1');
                (0, chai_1.expect)(camera.name).to.equal('offece');
                (0, chai_1.expect)(camera.username).to.equal('test');
                (0, chai_1.expect)(camera.password).to.equal('12345');
                (0, chai_1.expect)(camera.rstpLink).to.equal('rtsp://192.168.1.111:554/media/video1');
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
    // describe('Lifecycle', function () {
    //     it('should not save without password', function (done) {
    //         var user = new User({
    //             name: 'John',
    //             email: 'john@test.com',
    //             username: 'john',
    //             role: 'admin',
    //             token: "'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyN2ExNmE1MDcwY2YxYzM2YTEwODdkNCIsImVtYWlsIjoic2FzYW5AZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNjU0NzYwMzU3LCJpYXQiOjE2NTIxNjgzNTd9.nceF7BKaA6FUyC2cdYcH4x26RqYojRldTM3hBOegAiM"
    //         });
    //         user.save(function (err: Error) {
    //             expect(err).to.exist
    //                 .and.be.instanceof(Error)
    //                 .and.have.property('message', 'user validation failed');
    //             done();
    //         });
    //     });
    // });
});

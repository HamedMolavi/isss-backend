import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import fs from 'fs';

const token = process.env.sample_token;
let _file: any;


describe('test upload , dowloand , get list Image', function () {
    beforeEach(function (done) {
        done();
    });
    //test route for register new user in DB
    it('should send back a JSON object with file name and location and message', function (done) {
        request(app)
            .post('/file/upload')
            .set('Content-Type', 'multipart/form-data')
            .set('Authorization', `Bearer ${token}`)
            .attach('file', './assets/sample/test.jpg')
            .then(function (res) {
                let response = res.body;
                expect(res.status).to.equal(200);
                expect(response).to.have.property('name');
                expect(response).to.have.property('location');
                expect(response).to.have.property('message');
                done();
            });
    });

    //test route for register new user in DB
    it('should send back a image picture', function (done) {
        request(app)
            .get('/file/download/test.jpg')
            .set('Content-Type', 'multipart/form-data')
            .set('Authorization', `Bearer ${token}`)
            .then(function (res) {
                expect(res.status).to.equal(200);
                done();
            });
    });
});








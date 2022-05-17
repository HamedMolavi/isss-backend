import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';

const token = process.env.sample_token;
let _file: any;


describe('test upload , dowloand , get list Image', function () {
    beforeEach(function (done) {
        done();
    });
    //test route for upload image
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

    //test route for download image
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

    //test route for get list image
    it('should send back a jason with url and name image', function (done) {
        request(app)
            .get('/file/list')
            .set('Content-Type', 'multipart/form-data')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body[0];
                expect(userResponse).to.have.property('name');
                expect(userResponse).to.have.property('url');
                // Done
                done();
            });
    });
});








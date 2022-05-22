import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import Camera from '../../models/camera';


const token = process.env.sample_token;
let _camera: any;


describe('server run and server runnig and crud camera', function () {

    //test route for register new camera in DB
    it('should send back a JSON object with user for create new camera', function (done) {
        request(app)
            .post('/camera/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                ip: '172.10.10.1',
                name: 'offece',
                username: 'test',
                password: '12345',
                rstpLink: 'rtsp://192.168.1.111:554/media/video1'
            })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                if (res.body.message !== 'Camera already exists') {
                    let response = res.body;
                    expect(response.message).to.equal("Success");
                    expect(response.camera.ip).to.equal('172.10.10.1');
                    expect(response.camera.name).to.equal('offece');
                    expect(response.camera.username).to.equal('test');
                    expect(response.camera.password).to.equal('12345');
                    expect(response.camera.rstpLink).to.equal('rtsp://192.168.1.111:554/media/video1');
                } else {
                    let response = null;
                }
                // Done
                done();
            });

    });

    beforeEach(function (done) {
        Camera.findOne({}, (err: Error, camera: any) => {
            _camera = camera;
            done();
        });
    });

    //test route for get camera by id from DB
    it('should send back a JSON object for get camera with id', function (done) {


        //test route for get camera in DB
        request(app)
            .get('/camera/' + _camera._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.camera;
                expect(userResponse.ip).to.equal(_camera.ip);
                expect(userResponse.name).to.equal(_camera.name);
                expect(userResponse.username).to.equal(_camera.username);
                expect(userResponse.password).to.equal(_camera.password);
                expect(userResponse.rstpLink).to.equal(_camera.rstpLink);
                // Done
                done();
            });
    });


    //test route for edite camera in DB
    it('should send back a JSON object with id for edit camera', function (done) {
        let cameraEditJson = {
            name: 'bank',
            ip: '172.01.01.01',
        };
        request(app)
            .put('/camera/' + _camera._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(cameraEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let camera = res.body.camera;
                expect(camera.ip).to.equal(cameraEditJson.ip);
                expect(camera.name).to.equal(cameraEditJson.name);
                expect(camera.username).to.equal(_camera.username);
                expect(camera.password).to.equal(_camera.password);
                expect(camera.rstpLink).to.equal(_camera.rstpLink);
                // Done
                done();
            });
    });


    //test route for delete camera in DB 
    it('should send back a JSON object for delete camera', function (done) {

        request(app)
            .delete('/camera/' + _camera._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let result = res.body;
                expect(result.message).to.equal("Success");
                // Done
                done();
            });
    });

});








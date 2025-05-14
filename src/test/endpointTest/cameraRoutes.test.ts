import app from '../../server.ts';
import { expect } from 'chai';
import request from 'supertest';
import Camera, { ICamera } from '../../db/mongo/models/camera.js';
import mongoose from 'mongoose';
import { beforeEach } from 'mocha';

const token = process.env.sample_token;
let _camera: ICamera;

describe('server run and server runnig and crud camera', function () {
	//test route for register new camera in DB
	it('should send back a JSON object with camera for create new camera', function (done) {
		request(app)
			.post('/api/v1/cameras')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.send({
				name: 'office',
				network: '172.10.10.0',
				section_id: new mongoose.Types.ObjectId('6283724be1996b883080a495'),
				url: 'rtsp://192.168.1.111:554/media/video1',
				ip: '172.10.10.1',
				username: 'test',
				password: '12345',
				muted: ['628dc28ef014bc89f0280c4a', '62f341a1bd0e4b98100bf973'],
				is_enabled: true
			})
			.expect('Content-Type', /json/)
			.expect(201, function (err, res) {
				if (err) {
					return done(err);
				}
				if (res.body.success === true) {
					let response = res.body.data;

					expect(response.name).to.equal('office');
					expect(response.network).to.equal('172.10.10.0');
					expect(response.section_id.toString()).to.equal('6283724be1996b883080a495');
					expect(response.url).to.equal('rtsp://192.168.1.111:554/media/video1');
					expect(response.ip).to.equal('172.10.10.1');
					expect(response.muted).to.deep.equal(['628dc28ef014bc89f0280c4a', '62f341a1bd0e4b98100bf973']);
					expect(response.username).to.equal('test');
					expect(response.password).to.equal('12345');
					expect(response.is_enabled).to.equal(true);
				} else {
					let response = null;
				}
				// Done
				done();
			});
	});

	beforeEach(function (done) {
		Camera.findOne(
			{
				name: { $in: ['office', 'bank'] }
			},
			(err: Error, camera: ICamera) => {
				if (err) {
					console.log(err);
				}
				_camera = camera;
				done();
			}
		);
	});

	//test route for get camera by id from DB
	it('should send back a JSON object for get camera with id', function (done) {
		//test route for get camera in DB
		request(app)
			.get('/api/v1/cameras/' + _camera._id)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let userResponse = res.body.data;
				expect(userResponse.name).to.equal(_camera.name);
				expect(userResponse.network).to.equal(_camera.network);
				expect(userResponse.section_id.toString()).to.equal(_camera.section_id.toString());
				expect(userResponse.url).to.equal(_camera.url);
				expect(userResponse.ip).to.equal(_camera.ip);
				expect(userResponse.muted).to.deep.equals(_camera.muted.map((x) => x.toString()));
				expect(userResponse.username).to.equal(_camera.username);
				expect(userResponse.password).to.equal(_camera.password);
				expect(userResponse.is_enabled).to.equal(_camera.is_enabled);

				// Done
				done();
			});
	});

	//test route for get cameras from DB
	it('should send back a JSON object for get all cameras', function (done) {
		//test route for get camera in DB
		request(app)
			.get('/api/v1/cameras?page=1&perPage=2')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let userResponse = res.body.data;

				expect(userResponse[0]).to.have.property('_id');
				expect(userResponse[0]).to.have.property('network');
				expect(userResponse[0]).to.have.property('name');
				expect(userResponse[0]).to.have.property('section_id');
				expect(userResponse[0]).to.have.property('url');
				expect(userResponse[0]).to.have.property('ip');
				expect(userResponse[0]).to.have.property('username');
				expect(userResponse[0]).to.have.property('password');
				expect(userResponse[0]).to.have.property('muted');
				expect(userResponse[0]).to.have.property('is_enabled');
				// Done
				done();
			});
	});

	//test route for get search cameras from DB
	it('should send back a JSON object for search cameras', function (done) {
		//test route for search camera in DB
		request(app)
			.get('/api/v1/cameras?page=1&perPage=2&search=o')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let userResponse = res.body.data;

				expect(userResponse[0]).to.have.property('_id');
				expect(userResponse[0]).to.have.property('network');
				expect(userResponse[0]).to.have.property('name');
				expect(userResponse[0]).to.have.property('section_id');
				expect(userResponse[0]).to.have.property('url');
				expect(userResponse[0]).to.have.property('ip');
				expect(userResponse[0]).to.have.property('muted');
				expect(userResponse[0]).to.have.property('username');
				expect(userResponse[0]).to.have.property('password');
				expect(userResponse[0]).to.have.property('is_enabled');
				// Done
				done();
			});
	});

	//test route for edite camera in DB
	it('should send back a JSON object with id for edit camera', function (done) {
		let cameraEditJson = {
			name: 'bank',
			ip: '172.01.01.01'
		};
		request(app)
			.patch('/api/v1/cameras/' + _camera._id)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.send(cameraEditJson)
			.expect('Content-Type', /json/)
			.expect(201, function (err, res) {
				if (err) {
					return done(err);
				}
				let camera = res.body.data;

				expect(camera.name).to.equal(cameraEditJson.name);
				expect(camera.ip).to.equal(cameraEditJson.ip);
				expect(camera.section_id.toString()).to.equal(_camera.section_id.toString());
				expect(camera.url).to.equal(_camera.url);
				expect(camera.muted).to.deep.equals(_camera.muted.map((x) => x.toString()));
				expect(camera.network).to.equal(_camera.network);
				expect(camera.username).to.equal(_camera.username);
				expect(camera.password).to.equal(_camera.password);
				expect(camera.is_enabled).to.equal(_camera.is_enabled);
				// Done
				done();
			});
	});

	//test route for delete camera in DB
	it('should send back a JSON object for delete camera', function (done) {
		request(app)
			.delete('/api/v1/cameras/' + _camera._id)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect('Content-Type', /json/)
			.expect(201, function (err, res) {
				if (err) {
					return done(err);
				}
				let result = res.body;
				expect(result.success).to.equal(true);
				// expect(result.message.camera).to.equal(null);
				// Done
				done();
			});
	});
});

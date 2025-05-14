import app from '../../server.ts';
import { expect } from 'chai';
import request from 'supertest';
import CarColor, { ICarColor } from '../../db/mongo/models/carColor.js';

const token = process.env.sample_token;
let _carColor: ICarColor;

//create testing for register new car_color and edit , delete ,get car_color
describe('server run and crud car color', function () {
	//test route for register new car color in DB
	it('should send back a JSON object with car color for create new car color', function (done) {
		request(app)
			.post('/api/v1/carcolors')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.send({
				name: 'red'
			})
			.expect('Content-Type', /json/)
			.expect(201, function (err, res) {
				if (err) {
					return done(err);
				}
				if (res.body.message !== 'Car Color already exists') {
					let response = res.body;
					expect(response.data.name).to.equal('red');
				} else {
					let response = null;
				}
				// Done
				done();
			});
	});

	//get car_color test from DB
	beforeEach(function (done) {
		CarColor.findOne(
			{
				name: 'red'
			},
			function (err: Error, carColor: ICarColor) {
				if (err) {
					console.log(err);
				}
				_carColor = carColor;
				done();
			}
		);
	});

	//test route for get all car_colors from DB
	it('should send back a JSON object for get all car colors', function (done) {
		//test route for get car_colors in DB
		request(app)
			.get('/api/v1/carcolors?page=1&perPage=2')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let userResponse = res.body.data;
				expect(userResponse[0]).to.have.property('name');
				// Done
				done();
			});
	});

	//test route for search car_colors from DB
	it('should send back a JSON object for search car colors', function (done) {
		//test route for get car_colors in DB
		request(app)
			.get('/api/v1/carcolors?page=1&perPage=2$search=r')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let userResponse = res.body.data;
				expect(userResponse[0]).to.have.property('name');
				// Done
				done();
			});
	});

	//test route for get car_color by id from DB
	it('should send back a JSON object for get car color with id', function (done) {
		//test route for get car_color in DB
		request(app)
			.get('/api/v1/carcolors/' + _carColor._id)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let userResponse = res.body.data;
				expect(userResponse.name).to.equal(_carColor.name);
				// Done
				done();
			});
	});

	//test route for delete car_color in DB
	it('should send back a JSON object for delete car color', function (done) {
		request(app)
			.delete('/api/v1/carcolors/' + _carColor._id)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect('Content-Type', /json/)
			.expect(201, function (err, res) {
				if (err) {
					return done(err);
				}
				let result = res.body;
				expect(result.success).to.equal(true);
				// Done
				done();
			});
	});
});

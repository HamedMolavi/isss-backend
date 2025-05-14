import app from '../../server.ts';
import { expect } from 'chai';
import request from 'supertest';
import CarBrand, { ICarBrand } from '../../db/mongo/models/carBrand.js';

const token = process.env.sample_token;
let _carBrand: ICarBrand;

//create testing for register new car_brand and edit , delete ,get car
describe('server run and crud car brand', function () {
	//test route for register new car brand in DB
	it('should send back a JSON object with car brand for create new car brand', function (done) {
		request(app)
			.post('/api/v1/carbrands')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.send({
				name: 'pride'
			})
			.expect('Content-Type', /json/)
			.expect(201, function (err, res) {
				if (err) {
					return done(err);
				}
				if (res.body.message !== 'Car Brand already exists') {
					let response = res.body;
					expect(response.data.name).to.equal('pride');
				} else {
					let response = null;
				}
				// Done
				done();
			});
	});

	//get car_brand test from DB
	beforeEach(function (done) {
		CarBrand.findOne(
			{
				name: 'pride'
			},
			function (err: Error, carBrand: ICarBrand) {
				if (err) {
					console.log(err);
				}
				_carBrand = carBrand;
				done();
			}
		);
	});

	//test route for get all car_brands from DB
	it('should send back a JSON object for get all car brands', function (done) {
		//test route for get car_brands in DB
		request(app)
			.get('/api/v1/carbrands?page=1&perPage=1')
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

	//test endpoint for search car_brand from DB
	it('should send back a JSON object for search car brand', function (done) {
		//test route for get car_brands in DB
		request(app)
			.get('/api/v1/carbrands?page=1&perPage=1$search=pr')
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

	//test route for get car_brand by id from DB
	it('should send back a JSON object for get car brand with id', function (done) {
		//test route for get car_brand in DB
		request(app)
			.get('/api/v1/carbrands/' + _carBrand._id)
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let userResponse = res.body.data;
				expect(userResponse.name).to.equal(_carBrand.name);
				// Done
				done();
			});
	});

	//test route for delete car_brand in DB
	it('should send back a JSON object for delete car brand', function (done) {
		request(app)
			.delete('/api/v1/carbrands/' + _carBrand._id)
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

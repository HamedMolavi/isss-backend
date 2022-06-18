import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import Car, { ICar } from '../../models/car';


const token = process.env.sample_token;
let _car: any;

//create testing for register new car and edit , delete ,get car
describe('server run and crud car', function () {

    //get plate test from DB
    beforeEach(function (done) {
        //find plate by name
        Car.findOne({
            owner: { $in: ['test', 'john'] },
            number_plate: { $in: ['1234567', '7654321'] }
        }, (err: Error, car: ICar) => {
            if (err) {
                console.log(err);
            }
            _car = car;
            done();
        });
    });

    //test route for register new car in DB
    it('should send back a JSON object with car for create new car', function (done) {
        request(app)
            .post('/api/v1/cars/')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                owner: 'test',
                number_plate: '1234567',
                brand_id: '629592546558a38fbecb6d40',
                color_id: '629592546558a38fbecb6d40',
                camera_whitelist: ['test']
            })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                if (res.body.message !== 'car already exists') {
                    let response = res.body.car;

                    expect(response.owner).to.equal('test');
                    expect(response.number_plate).to.equal('1234567');
                    expect(response.brand_id.toString()).to.equal('629592546558a38fbecb6d40');
                    expect(response.color_id.toString()).to.equal('629592546558a38fbecb6d40');
                    expect(response.camera_whitelist).to.deep.equal(['test']);
                } else {
                    let response = null;
                }
                // Done
                done();
            });

    });

    //test route for get all cars by id from DB
    it('should send back a JSON object for get all cars', function (done) {


        //test route for get cars in DB
        request(app)
            .get('/api/v1/cars/list?page=1&perPage=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.cars;
                expect(userResponse[0].owner).to.equal('test');
                expect(userResponse[0].number_plate).to.equal('1234567');
                expect(userResponse[0].brand_id).to.equal('629592546558a38fbecb6d40');
                expect(userResponse[0].color_id).to.equal('629592546558a38fbecb6d40');
                expect(userResponse[0].camera_whitelist).to.deep.equal(['test']);

                // Done
                done();
            });
    });



    //test route for search cars by id from DB
    it('should send back a JSON object for search cars', function (done) {


        //test route for get cars in DB
        request(app)
            .get('/api/v1/cars/list?page=1&perPage=1&search=12')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.cars;
                expect(userResponse[0].owner).to.equal('test');
                expect(userResponse[0].number_plate).to.equal('1234567');
                expect(userResponse[0].brand_id).to.equal('629592546558a38fbecb6d40');
                expect(userResponse[0].color_id).to.equal('629592546558a38fbecb6d40');
                expect(userResponse[0].camera_whitelist).to.deep.equal(['test']);

                // Done
                done();
            });
    });


    //test route for get car by id from DB
    it('should send back a JSON object for get car with id', function (done) {


        //test route for get car in DB
        request(app)
            .get('/api/v1/cars/' + _car._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.car;

                expect(userResponse.owner).to.equal('test');
                expect(userResponse.number_plate).to.equal('1234567');
                expect(userResponse.brand_id.toString()).to.equal('629592546558a38fbecb6d40');
                expect(userResponse.color_id.toString()).to.equal('629592546558a38fbecb6d40');
                expect(userResponse.camera_whitelist).to.deep.equal(['test']);

                // Done
                done();
            });
    });


    //test route for edite car in DB
    it('should send back a JSON object with id for edit car', function (done) {
        let plateEditJson = {
            owner: 'john',
            number_plate: '7654321'
        };
        request(app)
            .put('/api/v1/cars/' + _car._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(plateEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let plate = res.body.car;

                expect(plate.owner).to.equal('john');
                expect(plate.number_plate).to.equal('7654321');
                expect(plate.brand_id.toString()).to.equal(_car.brand_id.toString());
                expect(plate.color_id.toString()).to.equal(_car.color_id.toString());
                expect(plate.camera_whitelist).to.deep.equal(_car.camera_whitelist);
                // Done
                done();
            });
    });


    //test route for delete car in DB 
    it('should send back a JSON object for delete car', function (done) {

        request(app)
            .delete('/api/v1/cars/' + _car._id)
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








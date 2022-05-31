import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import Car, { ICar } from '../../models/car';


const token = process.env.sample_token;
let _car: ICar;
let _updateCar: ICar;

//create testing for register new car and edit , delete ,get car
describe('server run and crud car', function () {

    //test route for register new car in DB
    it('should send back a JSON object with car for create new car', function (done) {
        request(app)
            .post('/car/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'pride'
            })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                if (res.body.message !== 'car already exists') {
                    let response = res.body;
                    expect(response.car.name).to.equal('pride');
                } else {
                    let response = null;
                }
                // Done
                done();
            });
    });

    //get car test from DB
    beforeEach(function (done) {

        Car.findOne({
            name: 'pride'
        }, function (err: Error, car: ICar) {
            if (err) {
                console.log(err);
            }
            _car = car;
            done();
        });
    });

    //test route for get all cars from DB
    it('should send back a JSON object for get all cars', function (done) {

        //test route for get car in DB
        request(app)
            .get('/car/list?page=1&perPage=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.cars;
                expect(userResponse[0]).to.have.property('name');
                // Done
                done();
            });
    });


    //test route for get car by id from DB
    it('should send back a JSON object for get car with id', function (done) {

        //test route for get car in DB
        request(app)
            .get('/car/' + _car._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.car;
                expect(userResponse.name).to.equal(_car.name);
                // Done
                done();
            });
    });

    //test route for delete car in DB 
    it('should send back a JSON object for delete car', function (done) {

        request(app)
            .delete('/car/' + _car._id)
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








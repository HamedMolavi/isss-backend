import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import Plate, { IPlate } from '../../models/plate';


const token = process.env.sample_token;
let _plate: any;

//create testing for register new plate and edit , delete ,get plate
describe('server run and crud plate', function () {

    //get plate test from DB
    beforeEach(function (done) {
        //find plate by name
        Plate.findOne({
            ncolor: { $in: ['red', 'blue'] },
            number: { $in: ['1234567', '9876543'] }
        }, (err: Error, plate: IPlate) => {
            if (err) {
                console.log(err);
            }
            _plate = plate;
            done();
        });
    });

    //test route for register new plate in DB
    it('should send back a JSON object with section for create new plate', function (done) {
        request(app)
            .post('/plate/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                number: '1234567',
                carBrand: 'BMW',
                color: 'red',
                owner: 'jhon'
            })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                if (res.body.message !== 'plate already exists') {
                    let response = res.body;

                    expect(response.plate.number).to.equal('1234567');
                    expect(response.plate.carBrand).to.equal('BMW');
                    expect(response.plate.color).to.equal('red');
                    expect(response.plate.owner).to.equal('jhon');
                } else {
                    let response = null;
                }
                // Done
                done();
            });

    });


    //test route for get plate by id from DB
    it('should send back a JSON object for get plate with id', function (done) {


        //test route for get plate in DB
        request(app)
            .get('/plate/' + _plate._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.plate;
                expect(userResponse.number).to.equal(_plate.number);
                expect(userResponse.carBrand).to.equal(_plate.carBrand);
                expect(userResponse.color).to.equal(_plate.color);
                expect(userResponse.owner).to.equal(_plate.owner);
                // Done
                done();
            });
    });


    //test route for edite plate in DB
    it('should send back a JSON object with id for edit plate', function (done) {
        let plateEditJson = {
            color: 'blue',
            number: '9876543',
        };
        request(app)
            .put('/plate/' + _plate._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(plateEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let plate = res.body.plate;
                expect(plate.number).to.equal(plateEditJson.number);
                expect(plate.color).to.equal(plateEditJson.color);
                expect(plate.carBrand).to.equal(plate.carBrand);
                expect(plate.owner).to.equal(plate.owner);
                // Done
                done();
            });
    });


    //test route for delete plate in DB 
    it('should send back a JSON object for delete plate', function (done) {

        request(app)
            .delete('/plate/' + _plate._id)
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








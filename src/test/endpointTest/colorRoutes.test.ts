import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import Color, { IColor } from '../../models/color';


const token = process.env.sample_token;
let _color: IColor;
let _updateColor: IColor;

//create testing for register new color and edit , delete ,get color
describe('server run and crud color', function () {

    //test route for register new color in DB
    it('should send back a JSON object with color for create new color', function (done) {
        request(app)
            .post('/color/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'red'
            })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                if (res.body.message !== 'Color already exists') {
                    let response = res.body;
                    expect(response.color.name).to.equal('red');
                } else {
                    let response = null;
                }
                // Done
                done();
            });
    });

    //get color test from DB
    beforeEach(function (done) {

        Color.findOne({
            name: 'red'
        }, function (err: Error, color: IColor) {
            if (err) {
                console.log(err);
            }
            _color = color;
            done();
        });
    });

    //test route for get all color from DB
    it('should send back a JSON object for get all color', function (done) {

        //test route for get color in DB
        request(app)
            .get('/color/list?page=1&perPage=2')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.colors;
                expect(userResponse[0]).to.have.property('name');
                // Done
                done();
            });
    });


    //test route for get color by id from DB
    it('should send back a JSON object for get color with id', function (done) {

        //test route for get color in DB
        request(app)
            .get('/color/' + _color._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.color;
                expect(userResponse.name).to.equal(_color.name);
                // Done
                done();
            });
    });

    //test route for delete color in DB 
    it('should send back a JSON object for delete color', function (done) {

        request(app)
            .delete('/color/' + _color._id)
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








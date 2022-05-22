import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import Personnel from '../../models/personnel';
import mongoose from 'mongoose';


const token = process.env.sample_token;
let _personnel: any;

//create testing for register new personnel and edit , delete ,get personnel
describe('server run and crud personnel', function () {

    //get personnel test from DB
    beforeEach(function (done) {
        //find personnel by name
        Personnel.findOne({}, (err: Error, personnel: any) => {
            _personnel = personnel;
            done();
        });
    });

    //test route for register new personnel in DB
    it('should send back a JSON object with section for create new personnel', function (done) {
        request(app)
            .post('/personnel/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'jack',
                family: 'jackson',
                phone: '09122222222',
                jobTitle: new mongoose.Types.ObjectId('6283724be1996b883080a495')
            })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                if (res.body.message !== 'personnel already exists') {
                    let response = res.body;
                    expect(response.personnel.name).to.equal('jack');
                    expect(response.personnel.family).to.equal('jackson');
                    expect(response.personnel.phone).to.equal('09122222222');
                } else {
                    let response = null;
                }
                // Done
                done();
            });

    });


    //test route for get personnel by id from DB
    it('should send back a JSON object for get personnel with id', function (done) {


        //test route for get personnel in DB
        request(app)
            .get('/personnel/' + _personnel._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.personnel;
                expect(userResponse.name).to.equal(_personnel.name);
                expect(userResponse.family).to.equal(_personnel.family);
                expect(userResponse.phone).to.equal(_personnel.phone);
                // Done
                done();
            });
    });


    //test route for edite personnel in DB
    it('should send back a JSON object with id for edit personnel', function (done) {
        let personnelEditJson = {
            name: 'john',
            family: 'johnson',
        };
        request(app)
            .put('/personnel/' + _personnel._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(personnelEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let personnel = res.body.personnel;
                expect(personnel.name).to.equal(personnelEditJson.name);
                expect(personnel.family).to.equal(personnelEditJson.family);
                expect(personnel.phone).to.equal(personnel.phone);
                expect(personnel.jobTitle).to.equal(personnel.jobTitle);
                // Done
                done();
            });
    });


    //test route for delete personnel in DB 
    it('should send back a JSON object for delete personnel', function (done) {

        request(app)
            .delete('/personnel/' + _personnel._id)
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








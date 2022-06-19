import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import Personnel, { IPersonnel } from '../../models/personnel';
import mongoose from 'mongoose';


const token = process.env.sample_token;
let _personnel: any;

//create testing for register new personnel and edit , delete ,get personnel
describe('server run and crud personnel', function () {

    //test route for register new personnel in DB
    it('should send back a JSON object with personnel for create new personnel', function (done) {
        request(app)
            .post('/api/v1/personnels/')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                first_name: "jack",
                last_name: "jackson",
                national_code: "123456789",
                email: "test@test.gmail.com",
                phone_number: "09122222222",
                job_id: "6283724be1996b883080a495",
                personnel_code: "6283724be1996b883080a495",
                section_id: "6283724be1996b883080a495",
                camera_whitelist: ["6283724be1996b883080a495", "6283724be1996b883080a495"],
                is_active: true,
                is_employee: true,
                is_dismissed: true
            })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                if (res.body.message !== 'Personnel already exists') {
                    let response = res.body;
                    expect(response.personnel.first_name).to.equal('jack');
                    expect(response.personnel.last_name).to.equal('jackson');
                    expect(response.personnel.national_code).to.equal('123456789');
                    expect(response.personnel.email).to.equal("test@test.gmail.com");
                    expect(response.personnel.phone_number).to.equal("09122222222");
                    expect(response.personnel.job_id).to.equal("6283724be1996b883080a495");
                    expect(response.personnel.personnel_code).to.equal("6283724be1996b883080a495");
                    expect(response.personnel.section_id).to.equal("6283724be1996b883080a495");
                    expect(response.personnel.camera_whitelist).to.deep.equal(["6283724be1996b883080a495", "6283724be1996b883080a495"]);
                    expect(response.personnel.is_active).to.equal(true);
                    expect(response.personnel.is_employee).to.equal(true);
                    expect(response.personnel.is_dismissed).to.equal(true);

                } else {
                    let response = null;
                }
                // Done
                done();
            });

    });



    //get personnel test from DB
    beforeEach(function (done) {
        //find personnel by name
        Personnel.findOne({
            name: { $in: ['jack', 'john'] },
            family: { $in: ['jackson', 'johnson'] },
        }, (err: Error, personnel: IPersonnel) => {
            if (err) {
                console.log(err);
            }
            _personnel = personnel;
            done();
        });
    });

    //test route for get all personnels from DB
    it('should send back a JSON object for get all personnels', function (done) {


        //test route for get personnel in DB
        request(app)
            .get('/api/v1/personnels?page=1&perPage=3')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.personnels;
                expect(userResponse[0]).to.have.property('first_name');
                expect(userResponse[0]).to.have.property('last_name');
                expect(userResponse[0]).to.have.property('national_code');
                expect(userResponse[0]).to.have.property('email');
                expect(userResponse[0]).to.have.property('phone_number');
                expect(userResponse[0]).to.have.property('job_id');
                expect(userResponse[0]).to.have.property('personnel_code');
                expect(userResponse[0]).to.have.property('section_id');
                expect(userResponse[0]).to.have.property('camera_whitelist');
                expect(userResponse[0]).to.have.property('is_active');
                expect(userResponse[0]).to.have.property('is_employee');
                expect(userResponse[0]).to.have.property('is_dismissed');
                // Done
                done();
            });
    });


    //test route for search personnels from DB
    it('should send back a JSON object for search personnels', function (done) {


        //test route for get personnel in DB
        request(app)
            .get('/api/v1/personnels?page=1&perPage=3&search=j')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.personnels;
                expect(userResponse[0]).to.have.property('first_name');
                expect(userResponse[0]).to.have.property('last_name');
                expect(userResponse[0]).to.have.property('national_code');
                expect(userResponse[0]).to.have.property('email');
                expect(userResponse[0]).to.have.property('phone_number');
                expect(userResponse[0]).to.have.property('job_id');
                expect(userResponse[0]).to.have.property('personnel_code');
                expect(userResponse[0]).to.have.property('section_id');
                expect(userResponse[0]).to.have.property('camera_whitelist');
                expect(userResponse[0]).to.have.property('is_active');
                expect(userResponse[0]).to.have.property('is_employee');
                expect(userResponse[0]).to.have.property('is_dismissed');
                // Done
                done();
            });
    });

    //test route for get personnel by id from DB
    it('should send back a JSON object for get personnel with id', function (done) {


        //test route for get personnel in DB
        request(app)
            .get('/api/v1/personnels/' + _personnel._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.personnel;
                expect(userResponse).to.have.property('first_name');
                // Done
                done();
            });
    });


    //test route for edite personnel in DB
    it('should send back a JSON object with id for edit personnel', function (done) {
        let personnelEditJson = {
            first_name: 'john',
            last_name: 'johnson',
        };
        request(app)
            .patch('/api/v1/personnels/' + _personnel._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(personnelEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let personnel = res.body.personnel;
                expect(personnel.first_name).to.equal('john');
                expect(personnel.last_name).to.equal('johnson');
                expect(personnel.national_code).to.equal('123456789');
                expect(personnel.email).to.equal("test@test.gmail.com");
                expect(personnel.phone_number).to.equal("09122222222");
                expect(personnel.job_id).to.equal("6283724be1996b883080a495");
                expect(personnel.personnel_code).to.equal("6283724be1996b883080a495");
                expect(personnel.section_id).to.equal("6283724be1996b883080a495");
                expect(personnel.camera_whitelist).to.deep.equal(["6283724be1996b883080a495", "6283724be1996b883080a495"]);
                expect(personnel.is_active).to.equal(true);
                expect(personnel.is_employee).to.equal(true);
                expect(personnel.is_dismissed).to.equal(true);

                // Done
                done();
            });
    });


    //test route for delete personnel in DB 
    it('should send back a JSON object for delete personnel', function (done) {

        request(app)
            .delete('/api/v1/personnels/' + _personnel._id)
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








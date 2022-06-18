import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import JobTitle, { IJobTitle } from '../../models/jobTitle';


const token = process.env.sample_token;
let _jobTitle: IJobTitle;

//create testing for register new jobTitle and edit , delete ,get jobTitle
describe('server run and crud jobTitle', function () {

    //test route for register new jobTitle in DB
    it('should send back a JSON object with jobTitle for create new jobTitle', function (done) {
        request(app)
            .post('/api/v1/jobTitles/')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'developer'
            })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                if (res.body.message !== 'jobTitle already exists') {
                    let response = res.body;
                    expect(response.jobTitle.name).to.equal('developer');
                    expect(response.jobTitle).to.have.property('_id');
                    expect(response.jobTitle).to.have.property('name');
                    expect(response.jobTitle).to.have.property('create_date');
                } else {
                    let response = null;
                }
                // Done
                done();
            });

    });


    //get jobTitle test from DB
    beforeEach(function (done) {
        //find jobTitle by name
        JobTitle.findOne({
            name: { $in: ['developer', 'police'] }
        }, (err: Error, jobTitle: IJobTitle) => {
            if (err) {
                console.log(err);
            }
            _jobTitle = jobTitle;
            done();
        });
    });

    //test route for get all jobTitles from DB
    it('should send back a JSON object for get all jobTitle', function (done) {


        //test route for get jobTitles in DB
        request(app)
            .get('/api/v1/jobTitles/?page=1&perPage=3')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.jobTitles;
                expect(userResponse[0]).have.to.property('name');

                // Done
                done();
            });
    });

     //test route for search jobTitles from DB
     it('should send back a JSON object for search jobTitle', function (done) {


        //test route for get jobTitles in DB
        request(app)
            .get('/api/v1/jobTitles/list?page=1&perPage=3&search=dev')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.jobTitles;
                expect(userResponse[0]).have.to.property('name');

                // Done
                done();
            });
    });


    //test route for get jobTitle by id from DB
    it('should send back a JSON object for get jobTitle with id', function (done) {


        //test route for get jobTitle in DB
        request(app)
            .get('/api/v1/jobTitles/' + _jobTitle._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.jobTitle;
                expect(userResponse.name).to.equal(_jobTitle.name);
                // Done
                done();
            });
    });


    //test route for edite jobTitle in DB
    it('should send back a JSON object with id for edit jobTitle', function (done) {
        let jobTitleEditJson = {
            name: 'police'
        };
        //test route for edit jobTitle in DB
        request(app)
            .put('/api/v1/jobTitles/' + _jobTitle._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(jobTitleEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let jobTitle = res.body.jobTitle;
                expect(jobTitle.name).to.equal(jobTitleEditJson.name);;
                // Done
                done();
            });
    });


    //test route for delete jobTitle in DB 
    it('should send back a JSON object for delete jobTitle', function (done) {

        request(app)
            .delete('/api/v1/jobTitles/' + _jobTitle._id)
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








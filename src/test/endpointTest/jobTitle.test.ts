import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import JobTitle from '../../models/jobTitle';

interface IJobTitle {
    id: string;
    name: string;
}

const token = process.env.sample_token;
let _jobTitle: any;

//create testing for register new jobTitle and edit , delete ,get jobTitle
describe('server run and crud jobTitle', function () {

    //get jobTitle test from DB
    beforeEach(function (done) {
        //find jobTitle by name
        JobTitle.findOne({}, (err: Error, jobTitle: IJobTitle | null) => {
            _jobTitle = jobTitle;
            done();
        });
    });

    //test route for register new jobTitle in DB
    it('should send back a JSON object with jobTitle for create new jobTitle', function (done) {
        request(app)
            .post('/jobTitle/register')
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
                } else {
                    let response = null;
                }
                // Done
                done();
            });

    });


    //test route for get jobTitle by id from DB
    it('should send back a JSON object for get jobTitle with id', function (done) {


        //test route for get camera in DB
        request(app)
            .get('/jobTitle/' + _jobTitle._id)
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
        request(app)
            .put('/jobTitle/' + _jobTitle._id)
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
            .delete('/jobTitle/' + _jobTitle._id)
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








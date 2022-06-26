import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';


const token = process.env.sample_token;


describe('server run and get report logs', function () {

    //test get sabotage report sabotage logs with token 
    it('should send back a JSON object with sabotage log report', function (done) {
        request(app)
            .post('/api/v1/reportmodels/sabotage?perPage=3&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                camera_id: 5,
                time: "05:30",
                date_start: "15.04.2021",
                date_end: "15.04.2023"
            })
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let response = res.body;
                expect(response.message).to.be.equal('Success');
                expect(response.report.hits.hits).to.be.an('Array');
                expect(response.report.hits.hits[0]._source.properties).to.be.an('Object');
                expect(response.report.hits.hits[0]._source.properties.camera_id).to.be.an('Number');
                expect(response.report.hits.hits[0]._source.properties.timestamp).to.be.an('Number');
                expect(response.report.hits.hits[0]._source.properties.m2c_id).to.be.an('Number');
                expect(response.report.hits.hits[0]._source.properties.confidence).to.be.an('Number');

                done();
            });
    });


    //test get fire report fire logs with token 
    it('should send back a JSON object with fire log report', function (done) {
        request(app)
            .post('/api/v1/reportmodels/fire?perPage=3&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                camera_id: "628dc289f014bc89f0280c48",
                time: "05:30",
                date_start: "15.04.2021",
                date_end: "15.04.2023",
                probability: 0.5
            })
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let response = res.body;
                expect(response.message).to.be.equal('Success');
                expect(response.report.hits.hits).to.be.an('Array');
                expect(response.report.hits.hits[0]._source.properties).to.be.an('Object');
                expect(response.report.hits.hits[0]._source.properties.camera_id).to.be.an('String');
                expect(response.report.hits.hits[0]._source.properties.timestamp).to.be.an('Number');
                expect(response.report.hits.hits[0]._source.properties.m2c_id).to.be.an('String');
                expect(response.report.hits.hits[0]._source.properties.confidence).to.be.an('Number');

                done();
            });
    });


    //test get fire report face logs with token 
    it('should send back a JSON object with face log report', function (done) {
        request(app)
            .post('/api/v1/reportmodels/face?perPage=3&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                camera_id: "628dc28ef014bc89f0280c4a",
                time: "05:30",
                date_start: "15.04.2021",
                date_end: "15.04.2023",
                personnel_id: "62ada289eac910a0f3f0c42e"
            })
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let response = res.body;
                expect(response.message).to.be.equal('Success');
                expect(response.report).to.be.an('Array');
                expect(response.report[0]).to.be.an('Object');
                expect(response.report[0].camera_id).to.be.an('String');
                expect(response.report[0].timestamp).to.be.an('Number');
                expect(response.report[0].fullname).to.be.an('String');

                done();
            });
    });


    //test get fire report people counting logs with token 
    it('should send back a JSON object with people counting log report', function (done) {
        request(app)
            .post('/api/v1/reportmodels/human?perPage=3&page=1')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                camera_id: "628dc28ef014bc89f0280c4a",
                time: "05:30",
                date_start: "15.04.2021",
                date_end: "15.04.2023",
                personnel_id: "62ada289eac910a0f3f0c42e"
            })
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let response = res.body;
                expect(response.message).to.be.equal('Success');
                expect(response.report.hits.hits).to.be.an('Array');
                expect(response.report.hits.hits[0]._source.properties).to.be.an('Object');
                expect(response.report.hits.hits[0]._source.properties.camera_id).to.be.an('String');
                expect(response.report.hits.hits[0]._source.properties.timestamp).to.be.an('Number');
                expect(response.report.hits.hits[0]._source.properties.m2c_id).to.be.an('String');
                expect(response.report.hits.hits[0]._source.properties.confidence).to.be.an('Number');
                expect(response.report.hits.hits[0]._source.properties.number_of_people).to.be.an('Number');

                done();
            });
    });


    //  //test get fire report people counting logs with token 
    //  it('should send back a JSON object with people counting log report', function (done) {
    //    //todo
    // });
});



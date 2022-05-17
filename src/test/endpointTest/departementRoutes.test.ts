import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import Departement from '../../models/departement';


const token = process.env.sample_token;
let _departement: any;

//create testing for register new departement and edit , delete ,get departement
describe('server run and crud departement', function () {

    //get departenet test from DB
    beforeEach(function (done) {
        //find departement by name
        Departement.findOne({ name: 'office' }, (err: Error, departement: any) => {
            _departement = departement;
            done();
        });
    });

    //test route for register new departement in DB
    it('should send back a JSON object with departement for create new departement', function (done) {
        request(app)
            .post('/departement/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'office'
            })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                if (res.body.message !== 'departement already exists') {
                    let response = res.body;
                    expect(response.departement.name).to.equal('office');
                } else {
                    let response = null;
                }
                // Done
                done();
            });

    });


    //test route for get departement by name from DB
    it('should send back a JSON object for get departement with name', function (done) {


        //test route for get camera in DB
        request(app)
            .get('/departement/' + _departement.name)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.departement;
                expect(userResponse.name).to.equal(_departement.name);
                // Done
                done();
            });
    });


    //test route for edite departement in DB
    it('should send back a JSON object with id for edit departement', function (done) {
        let departementEditJson = {
            name: 'bank'
        };
        request(app)
            .put('/departement/' + _departement._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(departementEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let departement = res.body.departement;
                expect(departement.name).to.equal(departementEditJson.name);;
                // Done
                done();
            });
    });


    //test route for delete departement in DB 
    it('should send back a JSON object for delete departement', function (done) {

        request(app)
            .delete('/departement/' + _departement._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let result = res.body;
                expect(result.message).to.equal("departement Deleted");
                // Done
                done();
            });
    });

});








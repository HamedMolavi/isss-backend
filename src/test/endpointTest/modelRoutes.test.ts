import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import Model, { IModel } from '../../models/model';


const token = process.env.sample_token;
let _model: IModel;

//create testing for get model
describe('server run and get model', function () {
    //get model test from DB
    beforeEach(function (done) {

        Model.findOne({
            category: { $in: ['fire'] }
        }, function (err: Error, model: IModel) {
            if (err) {
                console.log(err);
            }
            _model = model;
            done();
        });
    });
    //test route for get model by id from DB
    it('should send back a JSON object for get model with category', function (done) {

        //test route for get model in DB
        request(app)
            .get('/api/v1/models/' + _model.category)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse: IModel = res.body.model;
                expect(userResponse.category).to.equal(_model.category);
                expect(userResponse.name).to.equal(_model.name);
                expect(userResponse.uri).to.equal(_model.uri);
                // Done
                done();
            });
    });


    //test route for get all models from DB
    it('should send back a JSON object for get all models', function (done) {


        //test route for get personnel in DB
        request(app)
            .get('/api/v1/models?page=1&perPage=3')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.models;
                expect(res.body.message).to.equal('Success');
                expect(userResponse[0]).to.have.property('category');
                expect(userResponse[0]).to.have.property('name');
                expect(userResponse[0]).to.have.property('uri');
                // Done
                done();
            });
    });
});






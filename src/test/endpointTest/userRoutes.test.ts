import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';

describe('Our server', function () {
    it('should return a 200 response', function (done) {
        request(app)
            .get('/')
            .expect(200, done);
    });
    let token = '';
    let response: any;
    //Called once before any of the tests in this block begin.
    before(function (done) {

        done();
    });

    it('should send back a JSON object with user for create new user', function (done) {

        // response = {
        //     message: 'Success',
        //     user: {
        //         _id: '627b4509d8d6f53094eb6a08',
        //         name: 'test',
        //         email: 'tset@test.com',
        //         username: 'tset',
        //         password: '$2b$10$CI29hbB0nemkyP5lJclAPOxWVTiDLVmWsHRXXsXs4/G6oS2sm/pDq',
        //         role: 'admin',
        //         token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyN2I0ZDA1OWE4YmQ3ZDBjMzM5YmNhNyIsImVtYWlsIjoidHNldEB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTY1NDgzOTgxMywiaWF0IjoxNjUyMjQ3ODEzfQ.a7Amp2UrNsnU_ur2hFll0oCD24bVLsOtg50c2VV1tYo',
        //         __v: 0
        //     }
        // }



        request(app)
            .post('/register')
            .set('Content-Type', 'application/json')
            .send({
                name: 'John',
                email: 'john@test.com',
                username: 'john',
                password: '$2b$10$tmvoKkMYpXCZy8Dyj0sDUeZKV7ROnjP9KlY4Ymfr7GjCT8fEKDDA.',
                role: 'admin',
            })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                if (res.body.message !== 'User already exists') {
                    response = res.body;
                    console.log(response);
                } else {
                    response = null;
                }
                // Done
                done();
            });
    });


    it('should send back a JSON object for get user with username', function (done) {
        if (response === null) {
            response = {
                message: 'Success',
                user: {
                    _id: '627b4edfd9b05e02fa891ff1',
                    name: 'John',
                    email: 'john@test.com',
                    username: 'john',
                    password: '$2b$10$GU7HhbCLEuzA5hMoQ6FJ5ukEd4PtHnLje.C0PVlZzFQjyreeSSTxW',
                    role: 'admin',
                    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyN2I0ZWRmZDliMDVlMDJmYTg5MWZmMSIsImVtYWlsIjoiam9obkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTY1NDg0MDI4NywiaWF0IjoxNjUyMjQ4Mjg3fQ.WwslwDuxnBMhh9w50r4PYa39P9FewCeJxbkcKhmkW_4',
                    __v: 0
                }
            }
        }

        request(app)
            .get("/user/john")
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${response.user.token}`)
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let user = res.body.user;
                expect(user.id).to.equal(response.user.id);
                expect(user.name).to.equal(response.user.name);
                expect(user.email).to.equal(response.user.email);
                expect(user.username).to.equal(response.user.username);
                expect(user.password).to.equal(response.user.password);
                expect(user.role).to.equal(response.user.role);
                expect(user.token).to.equal(response.user.token);
                // Done
                done();
            });
    });
});
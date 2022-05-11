"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
describe('Our server', function () {
    //test default rote for server is running
    it('should return a 200 response', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get('/')
            .expect(200, done);
    });
    let token = '';
    let response;
    //Called once before any of the tests in this block begin.
    before(function (done) {
        done();
    });
    //test route for register new user in DB
    it('should send back a JSON object with user for create new user', function (done) {
        (0, supertest_1.default)(server_1.default)
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
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'User already exists') {
                response = res.body;
                console.log(response);
            }
            else {
                response = null;
            }
            // Done
            done();
        });
    });
    //test route for get user by username from DB
    it('should send back a JSON object for get user with username', function (done) {
        //if user already exists in DB create new response
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
            };
        }
        (0, supertest_1.default)(server_1.default)
            .get("/user/john")
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${response.user.token}`)
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let user = res.body.user;
            (0, chai_1.expect)(user.id).to.equal(response.user.id);
            (0, chai_1.expect)(user.name).to.equal(response.user.name);
            (0, chai_1.expect)(user.email).to.equal(response.user.email);
            (0, chai_1.expect)(user.username).to.equal(response.user.username);
            (0, chai_1.expect)(user.password).to.equal(response.user.password);
            (0, chai_1.expect)(user.role).to.equal(response.user.role);
            (0, chai_1.expect)(user.token).to.equal(response.user.token);
            // Done
            done();
        });
    });
});

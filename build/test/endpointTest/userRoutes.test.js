"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const mongoose_1 = __importDefault(require("mongoose"));
const server_2 = require("../../server");
let response;
describe('server run and register user', function () {
    //test default rote for server is running
    it('should return a 200 response', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get('/')
            .expect(200, done);
    });
    //Called once before any of the tests in this block begin.
    before(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_2.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once('connected', () => {
            mongoose_1.default.connection.db.dropDatabase();
            done();
        });
    });
    //test route for register new user in DB
    it('should send back a JSON object with user for create new user', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/user')
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
});
describe('server run and register user', function () {
    //test route for get user by username from DB
    it('should send back a JSON object for get user with username', function (done) {
        // //if user already exists in DB create new response
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
        console.log(response.user.username);
        //test route for get user in DB
        (0, supertest_1.default)(server_1.default)
            .get(`/${response.user.username}`)
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
            (0, chai_1.expect)(user.role).to.equal(response.user.role);
            // Done
            done();
        });
    });
    //test route for edite user in DB
    it('should send back a JSON object with id for edit user', function (done) {
        //if user already exists in DB create new response
        if (response === null) {
            response = {
                message: 'Success',
                user: {
                    _id: '627b4edfd9b05e02fa891ff1',
                    name: 'jack',
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
            .put(`/${response.user.id}`)
            .set('Content-Type', 'application/json')
            .send({
            name: 'jack',
            email: 'jack@test.com',
        })
            .set('Authorization', `Bearer ${response.user.token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let user = res.body.user;
            (0, chai_1.expect)(user.id).to.equal(response.user.id);
            (0, chai_1.expect)(user.name).to.equal(response.user.name);
            (0, chai_1.expect)(user.email).to.equal(response.user.email);
            (0, chai_1.expect)(user.username).to.equal(response.user.username);
            (0, chai_1.expect)(user.role).to.equal(response.user.role);
            // Done
            done();
        });
    });
});

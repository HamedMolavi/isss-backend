"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
const user_1 = __importDefault(require("./../../models/user"));
const token = process.env.sample_token;
let _user;
describe('server run and server runnig and register user', function () {
    describe('first test for registe new user and runnig app', function () {
        //test default rote for server is running
        it('should return a 200 response and message application works', function (done) {
            (0, supertest_1.default)(server_1.default)
                .get('/')
                .expect(200, function (err, res) {
                if (err) {
                    return done(err);
                }
                (0, chai_1.expect)(res.body.message).to.equal("Application works!");
                done();
            });
        });
        //test route for register new user in DB
        it('should send back a JSON object with user for create new user', function (done) {
            (0, supertest_1.default)(server_1.default)
                .post('/user/register')
                .set('Content-Type', 'application/json')
                .set('Authorization', `Bearer ${token}`)
                .send({
                name: 'John',
                email: 'john@test.com',
                username: 'john',
                password: 12345,
                role: 'admin',
            })
                .expect('Content-Type', /json/)
                .expect(201, function (err, res) {
                if (err) {
                    return done(err);
                }
                if (res.body.message !== 'User already exists') {
                    let response = res.body;
                    (0, chai_1.expect)(response.message).to.equal('User created');
                    (0, chai_1.expect)(response.user.name).to.equal('John');
                    (0, chai_1.expect)(response.user.email).to.equal('john@test.com');
                    (0, chai_1.expect)(response.user.username).to.equal('john');
                    (0, chai_1.expect)(response.user.password).to.equal('12345');
                    (0, chai_1.expect)(response.user.role).to.equal('admin');
                }
                else {
                    let response = null;
                }
                // Done
                done();
            });
        });
    });
    beforeEach(function (done) {
        user_1.default.findOne({ username: 'john' }, (err, user) => {
            _user = user;
            done();
        });
    });
    //test route for get user by username from DB
    it('should send back a JSON object for get user with username', function (done) {
        //test route for get user in DB
        (0, supertest_1.default)(server_1.default)
            .get('/user/' + _user.username)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.user;
            (0, chai_1.expect)(userResponse.name).to.equal(_user.name);
            (0, chai_1.expect)(userResponse.email).to.equal(_user.email);
            (0, chai_1.expect)(userResponse.username).to.equal(_user.username);
            (0, chai_1.expect)(userResponse.password).to.equal(_user.password);
            (0, chai_1.expect)(userResponse.role).to.equal(_user.role);
            // Done
            done();
        });
    });
    //test route for edite user in DB
    it('should send back a JSON object with id for edit user', function (done) {
        let userEditJson = {
            name: 'jack',
            email: 'jack@test.com',
        };
        console.log(_user);
        (0, supertest_1.default)(server_1.default)
            .put('/user/' + _user._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(userEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let user = res.body.user;
            (0, chai_1.expect)(user.name).to.equal(userEditJson.name);
            (0, chai_1.expect)(user.email).to.equal(userEditJson.email);
            (0, chai_1.expect)(user.username).to.equal(user.username);
            (0, chai_1.expect)(user.password).to.equal(_user.password);
            (0, chai_1.expect)(user.role).to.equal(_user.role);
            // Done
            done();
        });
    });
    //test route for login user 
    it('should send back a JSON object for login user', function (done) {
        (0, supertest_1.default)(server_1.default)
            .post('/user/login')
            .set('Content-Type', 'application/json')
            .send({
            username: "john",
            password: "12345"
        })
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let response = res.body;
            (0, chai_1.expect)(response.user._id).to.equal(_user._id.toString());
            (0, chai_1.expect)(response.user.name).to.equal(_user.name);
            (0, chai_1.expect)(response.user.email).to.equal(_user.email);
            (0, chai_1.expect)(response.user.username).to.equal(_user.username);
            (0, chai_1.expect)(response.user.password).to.equal(_user.password);
            (0, chai_1.expect)(response.user.role).to.equal(_user.role);
            // Done
            done();
        });
    });
    //test route for delete user 
    it('should send back a JSON object for delete user', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/user/' + _user._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let result = res.body;
            (0, chai_1.expect)(result.message).to.equal('User Deleted');
            // Done
            done();
        });
    });
});

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
    // describe('first test for registe new user and runnig app', function () {
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
            .post('/api/v1/users/')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            username: 'sasan',
            password: '12345',
            phone_number: '09330371133',
            event: true,
            report: true,
            camera: true,
            configuration: true
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'User already exists') {
                let user = res.body.user;
                (0, chai_1.expect)(res.body.message).to.equal('Success');
                (0, chai_1.expect)(user.username).to.equal('sasan');
                (0, chai_1.expect)(user.phone_number).to.equal('09330371133');
                (0, chai_1.expect)(user.event).to.equal(true);
                (0, chai_1.expect)(user.report).to.equal(true);
                (0, chai_1.expect)(user.camera).to.equal(true);
                (0, chai_1.expect)(user.configuration).to.equal(true);
            }
            else {
                let response = null;
            }
            // Done
            done();
        });
    });
    beforeEach(function (done) {
        user_1.default.findOne({
            username: { $in: ['sasan', 'jack'] },
        }, (err, user) => {
            if (err) {
                console.log(err);
            }
            _user = user;
            done();
        });
    });
    //test route for login user 
    it('should send back a JSON object for login user', function (done) {
        let loginUser;
        (0, supertest_1.default)(server_1.default)
            .post('/api/v1/users/login')
            .set('Content-Type', 'application/json')
            .send({
            username: "sasan",
            password: "12345"
        })
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let user = res.body.user;
            // expect(user._id.toString()).to.equal(loginUser._id.toString());
            (0, chai_1.expect)(user.username).to.equal(_user.username);
            (0, chai_1.expect)(user.password).to.equal(_user.password);
            (0, chai_1.expect)(user.role).to.equal(_user.role);
            (0, chai_1.expect)(user.event).to.equal(_user.event);
            (0, chai_1.expect)(user.report).to.equal(_user.report);
            (0, chai_1.expect)(user.camera).to.equal(_user.camera);
            (0, chai_1.expect)(user.configuration).to.equal(_user.configuration);
            // Done
            done();
        });
    });
    // });
    //test route for get all user from DB
    it('should send back a JSON object for get all user', function (done) {
        //test route for get all user in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/users?page=1&perPage=2')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.users;
            (0, chai_1.expect)(userResponse[0]).have.to.property('username');
            (0, chai_1.expect)(userResponse[0]).have.to.property('phone_number');
            (0, chai_1.expect)(userResponse[0]).have.to.property('role');
            (0, chai_1.expect)(userResponse[0]).have.to.property('password');
            (0, chai_1.expect)(userResponse[0]).have.to.property('event');
            (0, chai_1.expect)(userResponse[0]).have.to.property('report');
            (0, chai_1.expect)(userResponse[0]).have.to.property('camera');
            (0, chai_1.expect)(userResponse[0]).have.to.property('configuration');
            // Done
            done();
        });
    });
    //test route for search user from DB
    it('should send back a JSON object for search user', function (done) {
        //test route for search user in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/users?page=1&perPage=2&search=s')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.users;
            (0, chai_1.expect)(userResponse[0]).have.to.property('username');
            (0, chai_1.expect)(userResponse[0]).have.to.property('phone_number');
            (0, chai_1.expect)(userResponse[0]).have.to.property('role');
            (0, chai_1.expect)(userResponse[0]).have.to.property('password');
            (0, chai_1.expect)(userResponse[0]).have.to.property('event');
            (0, chai_1.expect)(userResponse[0]).have.to.property('report');
            (0, chai_1.expect)(userResponse[0]).have.to.property('camera');
            (0, chai_1.expect)(userResponse[0]).have.to.property('configuration');
            // Done
            done();
        });
    });
    //test route for get user by id from DB
    it('should send back a JSON object for get user with id', function (done) {
        //test route for get user in DB
        (0, supertest_1.default)(server_1.default)
            .get('/api/v1/users/' + _user._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
            if (err) {
                return done(err);
            }
            let userResponse = res.body.user;
            (0, chai_1.expect)(userResponse.username).to.equal(_user.username);
            (0, chai_1.expect)(userResponse.phone_number).to.equal(_user.phone_number);
            (0, chai_1.expect)(userResponse.role).to.equal(_user.role);
            (0, chai_1.expect)(userResponse.password).to.equal(_user.password);
            (0, chai_1.expect)(userResponse.event).to.equal(_user.event);
            (0, chai_1.expect)(userResponse.report).to.equal(_user.report);
            (0, chai_1.expect)(userResponse.camera).to.equal(_user.camera);
            (0, chai_1.expect)(userResponse.configuration).to.equal(_user.configuration);
            // Done
            done();
        });
    });
    //test route for edite user in DB
    it('should send back a JSON object with id for edit user', function (done) {
        let userEditJson = {
            username: 'jack',
        };
        console.log(_user);
        (0, supertest_1.default)(server_1.default)
            .patch('/api/v1/users/' + _user._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(userEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let user = res.body.user;
            (0, chai_1.expect)(user.username).to.equal(userEditJson.username);
            (0, chai_1.expect)(user.phone_number).to.equal(_user.phone_number);
            (0, chai_1.expect)(user.password).to.equal(_user.password);
            (0, chai_1.expect)(user.role).to.equal(_user.role);
            (0, chai_1.expect)(user.event).to.equal(_user.event);
            (0, chai_1.expect)(user.report).to.equal(_user.report);
            (0, chai_1.expect)(user.camera).to.equal(_user.camera);
            (0, chai_1.expect)(user.configuration).to.equal(_user.configuration);
            // Done
            done();
        });
    });
    //test route for delete user 
    it('should send back a JSON object for delete user', function (done) {
        (0, supertest_1.default)(server_1.default)
            .delete('/api/v1/users/' + _user._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            let result = res.body;
            (0, chai_1.expect)(result.message).to.equal('Success');
            // Done
            done();
        });
    });
});

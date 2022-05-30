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
            .post('/user/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
            username: 'test',
            password: '12345',
            phone_number: '0987654321'
        })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
            if (err) {
                return done(err);
            }
            if (res.body.message !== 'User already exists') {
                let user = res.body.user;
                (0, chai_1.expect)(res.body.message).to.equal('User created');
                (0, chai_1.expect)(user.username).to.equal('test');
                (0, chai_1.expect)(user.phone_number).to.equal('0987654321');
                (0, chai_1.expect)(user.role).to.equal('user');
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
            username: { $in: ['test', 'jack'] },
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
        //get user from DB
        // User.findOne({
        //     username: { $in: ['john'] },
        // }, (err: Error, user: IUser) => {
        //     if (err) {
        //         console.log(err);
        //     }
        //     loginUser = user;
        // });
        (0, supertest_1.default)(server_1.default)
            .post('/user/login')
            .set('Content-Type', 'application/json')
            .send({
            username: "test",
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
            // Done
            done();
        });
    });
    // });
    //test route for get all user from DB
    it('should send back a JSON object for get all user', function (done) {
        //test route for get all user in DB
        (0, supertest_1.default)(server_1.default)
            .get('/user/list?page=1&perPage=2')
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
            // Done
            done();
        });
    });
    //test route for get user by id from DB
    it('should send back a JSON object for get user with id', function (done) {
        //test route for get user in DB
        (0, supertest_1.default)(server_1.default)
            .get('/user/' + _user._id)
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
            (0, chai_1.expect)(user.username).to.equal(userEditJson.username);
            (0, chai_1.expect)(user.phone_number).to.equal(_user.phone_number);
            (0, chai_1.expect)(user.password).to.equal(_user.password);
            (0, chai_1.expect)(user.role).to.equal(_user.role);
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
            (0, chai_1.expect)(result.message).to.equal('Success');
            // Done
            done();
        });
    });
});

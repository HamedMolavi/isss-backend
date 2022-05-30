import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import User, { IUser } from './../../models/user';


const token = process.env.sample_token;
let _user: IUser;


describe('server run and server runnig and register user', function () {
    // describe('first test for registe new user and runnig app', function () {
    //test default rote for server is running
    it('should return a 200 response and message application works', function (done) {
        request(app)
            .get('/')
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                expect(res.body.message).to.equal("Application works!");
                done();
            });
    });

    //test route for register new user in DB
    it('should send back a JSON object with user for create new user', function (done) {
        request(app)
            .post('/user/register')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send({
                username: 'test',
                password: '12345',
                phone_number: '0123456789'
            })
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                if (res.body.message !== 'User already exists') {
                    let user = res.body.user;
                    expect(res.body.message).to.equal('User created');
                    expect(user.username).to.equal('test');
                    expect(user.phone_number).to.equal('0123456789');
                    expect(user.role).to.equal('user');
                } else  {
                    let response = null;
                }
                // Done
                done();
            });

    });
    beforeEach(function (done) {
        User.findOne({
            username: { $in: ['test', 'jack'] },
        }, (err: Error, user: IUser) => {
            if (err) {
                console.log(err);
            }
            _user = user;
            done();
        });
    });


    //test route for login user 
    it('should send back a JSON object for login user', function (done) {
        let loginUser: IUser;
        //get user from DB
        // User.findOne({
        //     username: { $in: ['john'] },
        // }, (err: Error, user: IUser) => {
        //     if (err) {
        //         console.log(err);
        //     }
        //     loginUser = user;
        // });

        request(app)
            .post('/user/login')
            .set('Content-Type', 'application/json')
            .send({
                username: "test",
                password: "12345"
            })
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let user = res.body.user;
                // expect(user._id.toString()).to.equal(loginUser._id.toString());
                expect(user.username).to.equal(_user.username);
                expect(user.password).to.equal(_user.password);
                expect(user.role).to.equal(_user.role);
                // Done
                done();
            });
    });

    // });
    //test route for get all user from DB
    it('should send back a JSON object for get all user', function (done) {


        //test route for get all user in DB
        request(app)
            .get('/user/list?page=1&perPage=2')
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.users;
                expect(userResponse[0]).have.to.property('username');
                expect(userResponse[0]).have.to.property('phone_number');
                expect(userResponse[0]).have.to.property('role');
                expect(userResponse[0]).have.to.property('password');
                // Done
                done();
            });
    });

    //test route for get user by id from DB
    it('should send back a JSON object for get user with id', function (done) {


        //test route for get user in DB
        request(app)
            .get('/user/' + _user._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.user;
                expect(userResponse.username).to.equal(_user.username);
                expect(userResponse.phone_number).to.equal(_user.phone_number);
                expect(userResponse.role).to.equal(_user.role);
                expect(userResponse.password).to.equal(_user.password);
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
        request(app)
            .put('/user/' + _user._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(userEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let user = res.body.user;
                expect(user.username).to.equal(userEditJson.username);
                expect(user.phone_number).to.equal(_user.phone_number);
                expect(user.password).to.equal(_user.password);
                expect(user.role).to.equal(_user.role);
                // Done
                done();
            });
    });

    //test route for delete user 
    it('should send back a JSON object for delete user', function (done) {

        request(app)
            .delete('/user/' + _user._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let result = res.body;
                expect(result.message).to.equal('Success');
                // Done
                done();
            });
    });

});








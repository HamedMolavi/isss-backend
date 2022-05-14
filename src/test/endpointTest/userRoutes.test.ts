import app from '../../server';
import { expect } from 'chai';
import request from 'supertest';
import User from '../../models/user';


const token = process.env.sample_token;
let _user: any;


describe('server run and server runnig and register user', function () {

    beforeEach(function (done) {
        User.findOne({ username: 'john' }, (err: Error, user: any) => {
            _user = user;
            done();
        });
    });

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
            .post('/user')
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
                if (err) { return done(err); }
                if (res.body.message !== 'User already exists') {
                    let response = res.body;
                    expect(response.message).to.equal('User created');
                    expect(response.user.name).to.equal('John');
                    expect(response.user.email).to.equal('john@test.com');
                    expect(response.user.username).to.equal('john');
                    expect(response.user.password).to.equal('12345');
                    expect(response.user.role).to.equal('admin');
                } else {
                    let response = null;
                }
                // Done
                done();
            });

    });


    //test route for get user by username from DB
    it('should send back a JSON object for get user with username', function (done) {


        //test route for get user in DB
        request(app)
            .get('/' + _user.username)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let userResponse = res.body.user;
                expect(userResponse.name).to.equal(_user.name);
                expect(userResponse.email).to.equal(_user.email);
                expect(userResponse.username).to.equal(_user.username);
                expect(userResponse.password).to.equal(_user.password);
                expect(userResponse.role).to.equal(_user.role);
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
        request(app)
            .put('/' + _user._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .send(userEditJson)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let user = res.body.user;
                expect(user.name).to.equal(userEditJson.name);
                expect(user.email).to.equal(userEditJson.email);
                expect(user.username).to.equal(user.username);
                expect(user.password).to.equal(_user.password);
                expect(user.role).to.equal(_user.role);
                // Done
                done();
            });
    });

    //test route for login user 
    it('should send back a JSON object for login user', function (done) {

        request(app)
            .post('/login')
            .set('Content-Type', 'application/json')
            .send({
                username: "john",
                password: "12345"
            })
            .expect('Content-Type', /json/)
            .expect(200, function (err, res) {
                if (err) { return done(err); }
                let response = res.body;
                expect(response.user._id).to.equal(_user._id.toString());
                expect(response.user.name).to.equal(_user.name);
                expect(response.user.email).to.equal(_user.email);
                expect(response.user.username).to.equal(_user.username);
                expect(response.user.password).to.equal(_user.password);
                expect(response.user.role).to.equal(_user.role);
                // Done
                done();
            });
    });


    //test route for delete user 
    it('should send back a JSON object for delete user', function (done) {

        request(app)
            .delete('/' + _user._id)
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
            .expect('Content-Type', /json/)
            .expect(201, function (err, res) {
                if (err) { return done(err); }
                let result = res.body;
                expect(result.message).to.equal('User Deleted');
               // Done
                done();
            });
    });

});








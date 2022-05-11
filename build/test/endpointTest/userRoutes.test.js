"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = __importDefault(require("../../server"));
const chai_1 = require("chai");
const supertest_1 = __importDefault(require("supertest"));
describe('Our server', function () {
    it('should return a 200 response', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get('/')
            .expect(200, done);
    });
    let token = '';
    let response;
    //Called once before any of the tests in this block begin.
    before(function (done) {
        response = {
            message: 'Success',
            user: {
                _id: '627b3e1b8799bd63e4ec1127',
                name: 'John',
                email: 'john@test.com',
                username: 'john',
                password: '$2b$10$tmvoKkMYpXCZy8Dyj0sDUeZKV7ROnjP9KlY4Ymfr7GjCT8fEKDDA.',
                role: 'admin',
                token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyN2I0NTA5ZDhkNmY1MzA5NGViNmEwOCIsImVtYWlsIjoiam9obkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTY1NDgzNzc2OSwiaWF0IjoxNjUyMjQ1NzY5fQ.IEpmvWEuqR4mc77V76piXWQZEx1qP-dVl17AEOVyVX4',
                __v: 0
            }
        };
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyN2IzZTFiODc5OWJkNjNlNGVjMTEyNyIsImVtYWlsIjoiam9obkB0ZXN0LmNvbSIsInJvbGUiOiJhZG1pbiIsImV4cCI6MTY1NDgzNTk5NSwiaWF0IjoxNjUyMjQzOTk1fQ.J0Zcm8y9Bka-ITGmWhZEFHbdm8UWNOxjqW2eqb4UvtQ";
        //  done();
        //     const response = await supertest(app).get('/user/sasan');
        //     token = response.body.token;
        //     done();
        //     //     // app = app.listen(done);
        //     //     app.listen(function (err: Error) {
        //     //         if (err) { return done(err); }
        //     //         done();
        //     //     });
        done();
    });
    it('should send back a JSON object with user set to user Jason', function (done) {
        (0, supertest_1.default)(server_1.default)
            .get("/user/john")
            .set('Content-Type', 'application/json')
            .set('Authorization', `Bearer ${token}`)
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

import { expect } from 'chai';
import connectDB, { Disconnect } from '../../db/connect';
import mongoose, { Connection } from 'mongoose';
import { dbUri } from '../../server';

describe('Models', function () {

    let User: any;
    beforeEach(function (done) {
        mongoose.connect(dbUri);
        mongoose.connection.once('connected', () => {
            mongoose.connection.db.dropDatabase();

            require('../../models/user').registerModels;
            // This is the right model because ^registerModels set it up for us.
            User = mongoose.model('User');
            done();
        });
    });
    
    afterEach(function (done) {
        Disconnect();
        done();
    });

    describe('register user', function () {

        it('should save user in db', function (done) {
            var user = new User({
                name: 'John',
                email: 'john@test.com',
                username: 'john',
                password: 12345,
                role: 'admin',
                token: "'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyN2ExNmE1MDcwY2YxYzM2YTEwODdkNCIsImVtYWlsIjoic2FzYW5AZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNjU0NzYwMzU3LCJpYXQiOjE2NTIxNjgzNTd9.nceF7BKaA6FUyC2cdYcH4x26RqYojRldTM3hBOegAiM"
            });
            user.save().then(() => {
                expect(user.name).to.equal('John');
                expect(user.email).to.equal('john@test.com');
                expect(user.username).to.equal('john');
                expect(user.role).to.equal('admin');
                expect(user.token).to.equal("'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyN2ExNmE1MDcwY2YxYzM2YTEwODdkNCIsImVtYWlsIjoic2FzYW5AZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNjU0NzYwMzU3LCJpYXQiOjE2NTIxNjgzNTd9.nceF7BKaA6FUyC2cdYcH4x26RqYojRldTM3hBOegAiM");
                done();
            }
            ).catch((err: Error) => {
                done(err);
            });
        });

    });
    // describe('Lifecycle', function () {

    //     it('should not save without password', function (done) {
    //         var user = new User({
    //             name: 'John',
    //             email: 'john@test.com',
    //             username: 'john',
    //             role: 'admin',
    //             token: "'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyN2ExNmE1MDcwY2YxYzM2YTEwODdkNCIsImVtYWlsIjoic2FzYW5AZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNjU0NzYwMzU3LCJpYXQiOjE2NTIxNjgzNTd9.nceF7BKaA6FUyC2cdYcH4x26RqYojRldTM3hBOegAiM"
    //         });
    //         user.save(function (err: Error) {
    //             expect(err).to.exist
    //                 .and.be.instanceof(Error)
    //                 .and.have.property('message', 'user validation failed');

    //             done();
    //         });
    //     });

    // });

});
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connect_1 = __importStar(require("../../../db/connect"));
const mongoose_1 = __importDefault(require("mongoose"));
describe('Models', function () {
    let User;
    beforeEach(function (done) {
        (0, connect_1.default)().then((connection) => {
            connection.db.dropDatabase();
            require('../../../models/user').registerModels;
            // This is the right model because ^registerModels set it up for us.
            User = mongoose_1.default.model('User');
            done();
        }).catch(() => {
            done();
        });
        // app.on('ready', () => {
        // mongoose.connect(dbUri);
        // mongoose.connection.once('connected', () => {
        //     mongoose.connection.db.dropDatabase();
        //     require('../../../models/user').registerModels;
        //     // This is the right model because ^registerModels set it up for us.
        //     User = mongoose.model('User');
        //     done();
        // });
    });
    afterEach(function (done) {
        (0, connect_1.Disconnect)();
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
                (0, chai_1.expect)(user.name).to.equal('John');
                (0, chai_1.expect)(user.email).to.equal('john@test.com');
                (0, chai_1.expect)(user.username).to.equal('john');
                (0, chai_1.expect)(user.role).to.equal('admin');
                (0, chai_1.expect)(user.token).to.equal("'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyN2ExNmE1MDcwY2YxYzM2YTEwODdkNCIsImVtYWlsIjoic2FzYW5AZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNjU0NzYwMzU3LCJpYXQiOjE2NTIxNjgzNTd9.nceF7BKaA6FUyC2cdYcH4x26RqYojRldTM3hBOegAiM");
                done();
            }).catch((err) => {
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
    //             password: 12345,
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

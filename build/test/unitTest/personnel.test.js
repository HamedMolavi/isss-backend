"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connect_1 = require("../../db/connect");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../../server");
//test personnel models
describe('personnel', function () {
    let Personnel;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once('connected', () => {
            mongoose_1.default.connection.db.dropDatabase();
            require('../../models/personnel').registerModels;
            // This is the right model because registerModels set it up for us.
            Personnel = mongoose_1.default.model('Personnel');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        (0, connect_1.Disconnect)();
        done();
    });
    //test personnel model
    describe('register personnel', function () {
        //create personnel model
        it('should save personnel in db', function (done) {
            var personnel = new Personnel({
                name: 'jack',
                family: 'jackson',
                phone: '123456789',
                jobTitle: new mongoose_1.default.Types.ObjectId('6283724be1996b883080a495')
            });
            //test this personnel model
            personnel.save().then(() => {
                (0, chai_1.expect)(personnel.name).to.equal('jack');
                (0, chai_1.expect)(personnel.family).to.equal('jackson');
                (0, chai_1.expect)(personnel.phone).to.equal('123456789');
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
});

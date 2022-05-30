"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connect_1 = require("../../db/connect");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../../server");
//test plate models
describe('plate', function () {
    let Plate;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri, { authSource: 'admin' });
        //listen for connection events
        mongoose_1.default.connection.once('connected', () => {
            //  mongoose.connection.db.dropDatabase();
            require('../../models/plate').registerModels;
            // This is the right model because registerModels set it up for us.
            Plate = mongoose_1.default.model('Plate');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        (0, connect_1.Disconnect)();
        done();
    });
    //test plate model
    describe('register plate', function () {
        //create plate model
        it('should save plate in db', function (done) {
            var plate = new Plate({
                number: '12345',
                carBrand: 'BMW',
                color: 'red',
                owner: 'John'
            });
            //test this plate model
            plate.save().then(() => {
                (0, chai_1.expect)(plate.number).to.equal('12345');
                (0, chai_1.expect)(plate.carBrand).to.equal('BMW');
                (0, chai_1.expect)(plate.color).to.equal('red');
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
});

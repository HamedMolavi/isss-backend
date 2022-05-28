"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connect_1 = require("../../db/connect");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../../server");
//test section models
describe('departement', function () {
    let Departement;
    //connect to DB before test
    beforeEach(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once('connected', () => {
            mongoose_1.default.connection.db.dropDatabase();
            require('../../models/departement').registerModels;
            // This is the right model because ^registerModels set it up for us.
            Departement = mongoose_1.default.model('Departement');
            done();
        });
    });
    //disconnect from DB after test
    afterEach(function (done) {
        (0, connect_1.Disconnect)();
        done();
    });
    //test departement model
    describe('register departement', function () {
        //create departement model
        it('should save user in db', function (done) {
            var departement = new Departement({
                name: 'offece',
                created_date: new Date()
            });
            //test this departement model
            departement.save().then(() => {
                (0, chai_1.expect)(departement.name).to.equal('offece');
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
});

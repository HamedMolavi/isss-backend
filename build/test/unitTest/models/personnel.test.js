"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connectMongo_1 = require("./../../../db/connectMongo");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("./../../../server");
//test personnel models
describe('personnel', function () {
    let Personnel;
    //connect to DB before test
    before(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once('connected', () => {
            mongoose_1.default.connection.db.dropDatabase().then(() => {
                require('../../models/personnel').registerModels;
                // This is the right model because register Models set it up for us.
                Personnel = mongoose_1.default.model('Personnel');
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
    //disconnect from DB after test
    after(function (done) {
        (0, connectMongo_1.Disconnect)();
        done();
    });
    //test personnel model
    describe('register personnel', function () {
        //create personnel model
        it('should save personnel in db', function (done) {
            var personnel = new Personnel({
                first_name: "sasan",
                last_name: "pilehvar",
                national_code: "123456789",
                email: "test@test.gmail.com",
                phone_number: "0123456789",
                job_id: "6283724be1996b883080a495",
                personnel_code: "6283724be1996b883080a495",
                section_id: "6283724be1996b883080a495",
                camera_whitelist: ["6283724be1996b883080a495", "6283724be1996b883080a495"],
                is_active: true,
                is_employee: true,
                is_dismissed: true
            });
            //test this personnel model
            personnel.save().then(() => {
                (0, chai_1.expect)(personnel.first_name).to.equal("sasan");
                (0, chai_1.expect)(personnel.last_name).to.equal("pilehvar");
                (0, chai_1.expect)(personnel.national_code).to.equal("123456789");
                (0, chai_1.expect)(personnel.email).to.equal("test@test.gmail.com");
                (0, chai_1.expect)(personnel.phone_number).to.equal("0123456789");
                (0, chai_1.expect)(personnel.job_id.toString()).to.equal("6283724be1996b883080a495");
                (0, chai_1.expect)(personnel.personnel_code).to.equal("6283724be1996b883080a495");
                (0, chai_1.expect)(personnel.section_id.toString()).to.equal("6283724be1996b883080a495");
                (0, chai_1.expect)(personnel.camera_whitelist).to.have.lengthOf(2);
                // expect(personnel.camera_whitelist).to.deep.equal(["6283724be1996b883080a495", "6283724be1996b883080a495"]);
                (0, chai_1.expect)(personnel.is_active).to.equal(true);
                (0, chai_1.expect)(personnel.is_employee).to.equal(true);
                (0, chai_1.expect)(personnel.is_dismissed).to.equal(true);
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
});

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connectMongo_1 = require("./../../../db/connectMongo");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("./../../../server");
//test section models
describe("section", function () {
    let Section;
    //connect to DB before test
    before(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once("connected", () => {
            mongoose_1.default.connection.db
                .dropDatabase()
                .then(() => {
                require("./../../../models/section").registerModels;
                // This is the right model because registerModels set it up for us.
                Section = mongoose_1.default.model("Section");
                done();
            })
                .catch((err) => {
                done(err);
            });
        });
    });
    //disconnect from DB after test
    after(function (done) {
        (0, connectMongo_1.Disconnect)();
        done();
    });
    //test section model
    describe("register section", function () {
        //create section model
        it("should save section in db", function (done) {
            var section = new Section({
                name: "offece",
                departement_id: new mongoose_1.default.Types.ObjectId("6283724be1996b883080a495"),
            });
            //test this section model
            section
                .save()
                .then(() => {
                (0, chai_1.expect)(section.name).to.equal("offece");
                (0, chai_1.expect)(section.departement_id.toString()).to.equal("6283724be1996b883080a495");
                done();
            })
                .catch((err) => {
                done(err);
            });
        });
    });
});

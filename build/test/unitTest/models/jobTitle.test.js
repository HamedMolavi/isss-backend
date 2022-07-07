"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connectMongo_1 = require("./../../../db/connectMongo");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("./../../../server");
//test jobTitle models
describe("jobTitle model", function () {
    let JobTitle;
    //connect to DB before test
    before(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once("connected", () => {
            mongoose_1.default.connection.db
                .dropDatabase()
                .then(() => {
                require("./../../../models/jobTitle").registerModels;
                // This is the right model because register Models set it up for us.
                JobTitle = mongoose_1.default.model("JobTitle");
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
    //test jobTitle model
    describe("register jobTitle", function () {
        //create jobTitle model
        it("should save jobTitle in db", function (done) {
            var jobTitle = new JobTitle({
                name: "developer",
            });
            //test this jobTitle model
            jobTitle
                .save()
                .then(() => {
                (0, chai_1.expect)(jobTitle.name).to.equal("developer");
                done();
            })
                .catch((err) => {
                done(err);
            });
        });
    });
});

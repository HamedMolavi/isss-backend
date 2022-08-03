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
describe("departement", function () {
    let Department;
    //connect to DB before test
    before(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once("connected", () => {
            mongoose_1.default.connection.db
                .dropDatabase()
                .then(() => {
                require("./../../../models/department").registerModels;
                // This is the right model because registerModels set it up for us.
                Department = mongoose_1.default.model("Department");
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
    //test department model
    describe("register department", function () {
        //create department model
        it("should save user in db", function (done) {
            var department = new Department({
                name: "offece",
                created_date: new Date(),
            });
            //test this departement model
            department
                .save()
                .then(() => {
                (0, chai_1.expect)(department.name).to.equal("offece");
                done();
            })
                .catch((err) => {
                done(err);
            });
        });
    });
});

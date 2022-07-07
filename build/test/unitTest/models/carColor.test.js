"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connectMongo_1 = require("./../../../db/connectMongo");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("./../../../server");
//test color models
describe("car color", function () {
    let Color;
    //connect to DB before test
    before(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once("connected", () => {
            mongoose_1.default.connection.db
                .dropDatabase()
                .then(() => {
                require("./../../../models/carColor").registerModels;
                // This is the right model because register Models set it up for us.
                Color = mongoose_1.default.model("Car_Color");
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
    //test color model
    describe("register color", function () {
        //create color model
        it("should save color in db", function (done) {
            var color = new Color({
                name: "red",
            });
            //test this color model
            color
                .save()
                .then(() => {
                (0, chai_1.expect)(color.name).to.equal("red");
                done();
            })
                .catch((err) => {
                done(err);
            });
        });
    });
});

"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const connectMongo_1 = require("../../db/connectMongo");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("../../server");
//test AI models
describe('AI', function () {
    let AI;
    // connect to DB before test
    beforeEach(function (done) {
        return __awaiter(this, void 0, void 0, function* () {
            //connect to DB
            mongoose_1.default.connect(server_1.dbUri);
            // listen for connection events
            //await mongoose.connection
            mongoose_1.default.connection.db.dropDatabase();
            require('../../models/AI').registerModels;
            // This is the right model because registerModels set it up for us.
            AI = mongoose_1.default.model('AI');
            done();
        });
    });
    // disconnect from DB after test
    afterEach(function (done) {
        (0, connectMongo_1.Disconnect)();
        done();
    });
    //test AI model
    describe('register AI', function () {
        //create AI model
        it('should save AI in DB', function (done) {
            var ai = new AI({
                start: "2019-01-01T00:00:00.000Z",
                end: "2019-01-01T00:00:00.000Z",
                thresholdid: 85,
                minTime: "2019-01-01T00:00:00.000Z",
                zone: ["zone1", "zone2"],
                type: "type1",
                minPeople: 1,
                maxPeople: 2
            });
            //test this AI model
            ai.save()
                .then(() => {
                (0, chai_1.expect)(ai.start).to.equal("2019-01-01T00:00:00.000Z");
                (0, chai_1.expect)(ai.end).to.equal("2019-01-01T00:00:00.000Z");
                (0, chai_1.expect)(ai.thresholdid).to.equal(85);
                (0, chai_1.expect)(ai.minTime).to.equal("2019-01-01T00:00:00.000Z");
                (0, chai_1.expect)(ai.zone[0]).to.equal("zone1");
                (0, chai_1.expect)(ai.type).to.equal("type1");
                (0, chai_1.expect)(ai.minPeople).to.equal(1);
                (0, chai_1.expect)(ai.maxPeople).to.equal(2);
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
});

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
const connectMongo_1 = require("./../../../db/connectMongo");
const mongoose_1 = __importDefault(require("mongoose"));
const server_1 = require("./../../../server");
//test  models model
describe('model2camera', function () {
    let Model2Camera;
    //connect to DB before test
    before(function (done) {
        //connect to DB
        mongoose_1.default.connect(server_1.dbUri);
        //listen for connection events
        mongoose_1.default.connection.once('connected', () => __awaiter(this, void 0, void 0, function* () {
            yield mongoose_1.default.connection.db.dropDatabase().then(() => {
                require('./../../../models/modelToCamera').registerModels;
                // This is the right model because register Models set it up for us.
                Model2Camera = mongoose_1.default.model('ModelToCamera');
                done();
            }).catch((err) => {
                done(err);
            });
        }));
    });
    //disconnect from DB after test
    after(function (done) {
        (0, connectMongo_1.Disconnect)();
        done();
    });
    //test ModelToCamera
    describe('register ModelToCamera', function () {
        //create model ModelToCamera
        it('should save ModelToCamera in db', function (done) {
            var modelToCamera = new Model2Camera({
                model_id: "628dcf08f014bc89f0280c60",
                camera_id: "628dcf08f014bc89f0280c60",
            });
            //test this model
            modelToCamera.save().then(() => {
                (0, chai_1.expect)(modelToCamera.model_id.toString()).to.equal('628dcf08f014bc89f0280c60');
                (0, chai_1.expect)(modelToCamera.camera_id.toString()).to.equal('628dcf08f014bc89f0280c60');
                done();
            }).catch((err) => {
                done(err);
            });
        });
    });
});

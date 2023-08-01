import app from "../../server.ts";
import { expect } from "chai";
import request from "supertest";
import Model, { IModel } from "../../models/model";
import mongoose from "mongoose";
import { NextFunction } from "express";

const token = process.env.sample_token;
let _model: any;

//create testing for get model
describe("server run and get model",function (this: any) {
  //seve new models before test and get it
  before(function (done: NextFunction) {
    let model = new Model({
      _id: new mongoose.Types.ObjectId("628dcf2df014bc89f0280c62"),
      name: "googlenet",
      category: "fire",
      uri: "/home/mohsen/PycharmProjects/FireDetectionPackage/models/fire_exception.onnx",
    });
    model.save();
    done();
  });

  //delete model after test
  after(function (done: NextFunction) {
    Model.deleteOne({ category: "fire" }).exec();
    done();
  });
  //test route for get model by id from DB
  it("should send back a JSON object for get model with category", function (done) {
    //test route for get model in DB
    request(app)
      .get("/api/v1/models/fire")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let userResponse = res.body.data;
        expect(res.body.success).to.equal(true);
        expect(userResponse.category).to.equal("fire");
        expect(userResponse.name).to.equal("googlenet");
        expect(userResponse.uri).to.equal(
          "/home/mohsen/PycharmProjects/FireDetectionPackage/models/fire_exception.onnx"
        );
        // Done
        done();
      });
  });

  //test route for get all models from DB
  it("should send back a JSON object for get all models", function (done) {
    //test route for get personnel in DB
    request(app)
      .get("/api/v1/models?page=1&perPage=3")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let userResponse = res.body.data;
        expect(res.body.success).to.equal(true);
        expect(userResponse[0]).to.have.property("category");
        expect(userResponse[0]).to.have.property("name");
        expect(userResponse[0]).to.have.property("uri");
        // Done
        done();
      });
  });
});

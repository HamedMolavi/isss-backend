import { expect } from "chai";
import { Disconnect } from "../../../db/mongo/connect.database";
import mongoose from "mongoose";
import { dbUri } from "../../../server.ts";

//test  models model
describe("model2camera", function () {
  let Model2Camera: any;
  //connect to DB before test
  before(function (done) {
    //connect to DB
    mongoose.connect(dbUri);
    //listen for connection events
    mongoose.connection.once("connected", async () => {
      mongoose.connection.db
        .dropDatabase()
        .then(() => {
          require("./../../../models/modelToCamera").registerModels;
          // This is the right model because register Models set it up for us.
          Model2Camera = mongoose.model("ModelToCamera");
          done();
        })
        .catch((err: Error) => {
          done(err);
        });
    });
  });
  //disconnect from DB after test
  after(function (done) {
    Disconnect();
    done();
  });
  //test ModelToCamera
  describe("register ModelToCamera", function () {
    //create model ModelToCamera
    it("should save ModelToCamera in db", function (done) {
      var modelToCamera = new Model2Camera({
        model_id: "628dcf08f014bc89f0280c60",
        camera_id: "628dcf08f014bc89f0280c60",
      });
      //test this model
      modelToCamera
        .save()
        .then(() => {
          expect(modelToCamera.model_id.toString()).to.equal(
            "628dcf08f014bc89f0280c60"
          );
          expect(modelToCamera.camera_id.toString()).to.equal(
            "628dcf08f014bc89f0280c60"
          );
          done();
        })
        .catch((err: Error) => {
          done(err);
        });
    });
  });
});

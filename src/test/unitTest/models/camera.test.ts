import { expect } from "chai";
import { Disconnect } from "../../../db/connectMongo";
import mongoose, { Schema } from "mongoose";
import { dbUri } from "../../../server";

//test camera models
describe("camera", function () {
  let Camera: any;
  //connect to DB before test
  before(function (done) {
    //connect to DB
    mongoose.connect(dbUri);
    //listen for connection events
    mongoose.connection.once("connected", () => {
      mongoose.connection.db
        .dropDatabase()
        .then(() => {
          require("./../../../models/camera").registerModels;
          // This is the right model because ^registerModels set it up for us.
          Camera = mongoose.model("Camera");
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
  //test camera model
  describe("register camera", function () {
    //create camera model
    it("should save camera in db", function (done) {
      var camera = new Camera({
        name: "office",
        network : "172.10.10.0",
        section_id: new mongoose.Types.ObjectId("6283724be1996b883080a495"),
        url: "rtsp://192.168.1.111:554/media/video1",
        ip: "172.10.10.1",
        username: "test",
        password: "12345",
        muted :["628dc28ef014bc89f0280c4a", "62f341a1bd0e4b98100bf973"],
        is_enabled: true,
      });
      //test this camera model
      camera
        .save()
        .then(() => {
          expect(camera.name).to.equal("office");
          expect(camera.network).to.equal("172.10.10.0");
          expect(camera.section_id.toString()).to.equal(
            "6283724be1996b883080a495"
          );
          expect(camera.url).to.equal("rtsp://192.168.1.111:554/media/video1");
          expect(camera.ip).to.equal("172.10.10.1");
          expect(camera.username).to.equal("test");
          expect(camera.password).to.equal("12345");
          expect(camera.muted[0]?.toString()).to.equal("628dc28ef014bc89f0280c4a");
          expect(camera.muted[1]?.toString()).to.equal("62f341a1bd0e4b98100bf973");
          expect(camera.is_enabled).to.equal(true);

          done();
        })
        .catch((err: Error) => {
          done(err);
        });
    });
  });
});

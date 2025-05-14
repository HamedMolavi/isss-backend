import { expect } from "chai";
import { Disconnect } from "../../../db/mongo/connect.database";
import mongoose from "mongoose";
import { dbUri } from "../../../server.ts";

//test Schedule models
describe("Schedule", function () {
  let Schedule: any;
  //connect to DB before test
  before(function (done) {
    //connect to DB
    mongoose.connect(dbUri);
    //listen for connection events
    mongoose.connection.once("connected", () => {
      mongoose.connection.db
        .dropDatabase()
        .then(() => {
          require("./../../../models/schedule").registerModels;
          // This is the right model because register Models set it up for us.
          Schedule = mongoose.model("Schedule");
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
  //test Schedule model
  describe("register Schedule", function () {
    //create Schedule model
    it("should save Schedule in DB", function (done) {
      var schedule = new Schedule({
        start_cron: "00 10 * * 1",
        stop_cron: "00 12 * * 1",
        model_camera_id: new mongoose.Types.ObjectId(
          "6283724be1996b883080a495"
        ),
        config: {
          threshold: 0,
          zones: [
            [0, 0, 0, 0],
            [2, 3, 5, 2],
          ],
          min_people: 1,
          max_people: 2,
        },
      });
      //test this AI model
      schedule
        .save()
        .then(() => {
          expect(schedule.start_cron).to.equal("00 10 * * 1");
          expect(schedule.stop_cron).to.equal("00 12 * * 1");
          expect(schedule.model_camera_id.toString()).to.equal(
            "6283724be1996b883080a495"
          );
          expect(schedule.config.threshold).to.equal(0);
          expect(schedule.config.zones).to.deep.equal([
            [0, 0, 0, 0],
            [2, 3, 5, 2],
          ]);
          expect(schedule.config.min_people).to.equal(1);
          expect(schedule.config.max_people).to.equal(2);

          done();
        })
        .catch((err: Error) => {
          done(err);
        });
    });
  });
});

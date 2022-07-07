import { expect } from "chai";
import { Disconnect } from "./../../../db/connectMongo";
import mongoose from "mongoose";
import { dbUri } from "./../../../server";

//test personnel models
describe("personnel", function () {
  let Personnel: any;
  //connect to DB before test
  before(function (done) {
    //connect to DB
    mongoose.connect(dbUri);
    //listen for connection events
    mongoose.connection.once("connected", () => {
      mongoose.connection.db
        .dropDatabase()
        .then(() => {
          require("./../../../models/personnel").registerModels;
          // This is the right model because register Models set it up for us.
          Personnel = mongoose.model("Personnel");
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
  //test personnel model
  describe("register personnel", function () {
    //create personnel model
    it("should save personnel in db", function (done) {
      var personnel = new Personnel({
        first_name: "sasan",
        last_name: "pilehvar",
        national_code: "123456789",
        email: "test@test.gmail.com",
        phone_number: "0123456789",
        job_id: "6283724be1996b883080a495",
        personnel_code: "6283724be1996b883080a495",
        section_id: "6283724be1996b883080a495",
        camera_whitelist: [
          "6283724be1996b883080a495",
          "6283724be1996b883080a495",
        ],
        is_active: true,
        is_employee: true,
        is_dismissed: true,
      });
      //test this personnel model
      personnel
        .save()
        .then(() => {
          expect(personnel.first_name).to.equal("sasan");
          expect(personnel.last_name).to.equal("pilehvar");
          expect(personnel.national_code).to.equal("123456789");
          expect(personnel.email).to.equal("test@test.gmail.com");
          expect(personnel.phone_number).to.equal("0123456789");
          expect(personnel.job_id.toString()).to.equal(
            "6283724be1996b883080a495"
          );
          expect(personnel.personnel_code).to.equal("6283724be1996b883080a495");
          expect(personnel.section_id.toString()).to.equal(
            "6283724be1996b883080a495"
          );
          expect(personnel.camera_whitelist).to.have.lengthOf(2);
          // expect(personnel.camera_whitelist).to.deep.equal(["6283724be1996b883080a495", "6283724be1996b883080a495"]);
          expect(personnel.is_active).to.equal(true);
          expect(personnel.is_employee).to.equal(true);
          expect(personnel.is_dismissed).to.equal(true);

          done();
        })
        .catch((err: Error) => {
          done(err);
        });
    });
  });
});

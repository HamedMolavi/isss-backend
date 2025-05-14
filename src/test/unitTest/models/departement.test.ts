import { expect } from "chai";
import { Disconnect } from "../../../db/mongo/connect.database";
import mongoose from "mongoose";
import { dbUri } from "../../../server.ts";

//test section models
describe("departement", function () {
  let Department: any;
  //connect to DB before test
  before(function (done) {
    //connect to DB
    mongoose.connect(dbUri);
    //listen for connection events
    mongoose.connection.once("connected", () => {
      mongoose.connection.db
        .dropDatabase()
        .then(() => {
          require("./../../../models/department").registerModels;
          // This is the right model because registerModels set it up for us.
          Department = mongoose.model("Department");
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
          expect(department.name).to.equal("offece");
          done();
        })
        .catch((err: Error) => {
          done(err);
        });
    });
  });
});

import { expect } from "chai";
import { Disconnect } from "../../../db/mongo/connect.database";
import mongoose from "mongoose";
import { dbUri } from "../../../server.ts";

//test user models
describe("users", function () {
  let User: any;
  //connect to DB before test
  before(function (done) {
    //connect to DB
    mongoose.connect(dbUri);
    //listen for connection events
    mongoose.connection.once("connected", () => {
      mongoose.connection.db
        .dropDatabase()
        .then(() => {
          require("./../../../models/user").registerModels;
          // This is the right model because registerModels set it up for us.
          User = mongoose.model("User");
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
  //test user model
  describe("register user", function () {
    it("should save user in db", function (done) {
      var user = new User({
        username: "john",
        password: "123452",
        phone_number: "0123456789",
        role: "user",
        event: true,
        report: true,
        camera: true,
        configuration: true,
      });
      user
        .save()
        .then(() => {
          expect(user.username).to.equal("john");
          expect(user.phone_number).to.equal("0123456789");
          expect(user.role).to.equal("user");
          expect(user.event).to.equal(true);
          expect(user.report).to.equal(true);
          expect(user.camera).to.equal(true);
          expect(user.configuration).to.equal(true);

          done();
        })
        .catch((err: Error) => {
          // done(err);
        });
    });
  });
  // describe('Lifecycle', function () {

  //     it('should not save without password', function (done) {
  //         var user = new User({
  //             name: 'John',
  //             email: 'john@test.com',
  //             username: 'john',
  //             role: 'admin',
  //             token: "'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjYyN2ExNmE1MDcwY2YxYzM2YTEwODdkNCIsImVtYWlsIjoic2FzYW5AZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNjU0NzYwMzU3LCJpYXQiOjE2NTIxNjgzNTd9.nceF7BKaA6FUyC2cdYcH4x26RqYojRldTM3hBOegAiM"
  //         });
  //         user.save(function (err: Error) {
  //             expect(err).to.exist
  //                 .and.be.instanceof(Error)
  //                 .and.have.property('message', 'user validation failed');

  //             done();
  //         });
  //     });

  // });
});

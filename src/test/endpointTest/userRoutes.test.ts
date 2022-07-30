import app from "../../server";
import { expect } from "chai";
import request from "supertest";
import User, { IUser } from "./../../models/user";

const token = process.env.sample_token;
let _user: IUser;

describe("server run and server runnig and register user", function () {
  // describe('first test for registe new user and runnig app', function () {
  //test default rote for server is running
  it("should return a 200 response and message application works", function (done) {
    request(app)
      .get("/")
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        expect(res.body.message).to.equal("Application works!");
        done();
      });
  });

  //test route for register new user in DB
  it("should send back a JSON object with user for create new user", function (done) {
    request(app)
      .post("/api/v1/users/")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        username: "sasan",
        password: "12345",
        phone_number: "09330371133",
        event: true,
        report: true,
        camera: true,
        configuration: true,
      })
      .expect("Content-Type", /json/)
      .expect(201, function (err, res) {
        if (err) {
          return done(err);
        }
        if (res.body.success !== false) {
          let user = res.body.data;
          console.log(user);
          expect(res.body.success).to.equal(true);
          expect(user.username).to.equal("sasan");
          expect(user.phone_number).to.equal("09330371133");
          expect(user.event).to.equal(true);
          expect(user.report).to.equal(true);
          expect(user.camera).to.equal(true);
          expect(user.configuration).to.equal(true);
        } else {
          let response = null;
        }
        // Done
        done();
      });
  });
  beforeEach(function (done) {
    User.findOne(
      {
        username: { $in: ["sasan", "jack"] },
      },
      (err: Error, user: IUser) => {
        if (err) {
          console.log(err);
        }
        _user = user;
        done();
      }
    );
  });

  //test route for login user
  it("should send back a JSON object for login user", function (done) {
    let loginUser: IUser;

    request(app)
      .post("/api/v1/users/login")
      .set("Content-Type", "application/json")
      .send({
        username: "sasan",
        password: "12345",
      })
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let user = res.body.data;
        // expect(user._id.toString()).to.equal(loginUser._id.toString());
        expect(user.username).to.equal(_user.username);
        expect(user.role).to.equal(_user.role);
        expect(user.event).to.equal(_user.event);
        expect(user.report).to.equal(_user.report);
        expect(user.camera).to.equal(_user.camera);
        expect(user.configuration).to.equal(_user.configuration);
        // Done
        done();
      });
  });

  // });
  //test route for get all user from DB
  it("should send back a JSON object for get all user", function (done) {
    //test route for get all user in DB
    request(app)
      .get("/api/v1/users?page=1&perPage=2")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let userResponse = res.body.data;
        expect(userResponse[0]).have.to.property("username");
        expect(userResponse[0]).have.to.property("phone_number");
        expect(userResponse[0]).have.to.property("role");
        expect(userResponse[0]).have.to.property("event");
        expect(userResponse[0]).have.to.property("report");
        expect(userResponse[0]).have.to.property("camera");
        expect(userResponse[0]).have.to.property("configuration");
        // Done
        done();
      });
  });

  //test route for search user from DB
  it("should send back a JSON object for search user", function (done) {
    //test route for search user in DB
    request(app)
      .get("/api/v1/users?page=1&perPage=2&search=s")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let userResponse = res.body.data;
        expect(userResponse[0]).have.to.property("username");
        expect(userResponse[0]).have.to.property("phone_number");
        expect(userResponse[0]).have.to.property("role");
        expect(userResponse[0]).have.to.property("event");
        expect(userResponse[0]).have.to.property("report");
        expect(userResponse[0]).have.to.property("camera");
        expect(userResponse[0]).have.to.property("configuration");
        // Done
        done();
      });
  });

  //test route for get user by id from DB
  it("should send back a JSON object for get user with id", function (done) {
    //test route for get user in DB
    request(app)
      .get("/api/v1/users/" + _user._id)
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let userResponse = res.body.data;
        console.log("user rsponse : " + userResponse);
        expect(userResponse.username).to.equal(_user.username);
        expect(userResponse.phone_number).to.equal(_user.phone_number);
        expect(userResponse.role).to.equal(_user.role);
        expect(userResponse.event).to.equal(_user.event);
        expect(userResponse.report).to.equal(_user.report);
        expect(userResponse.camera).to.equal(_user.camera);
        expect(userResponse.configuration).to.equal(_user.configuration);
        // Done
        done();
      });
  });

  //test route for edite user in DB
  it("should send back a JSON object with id for edit user", function (done) {
    let userEditJson = {
      username: "jack",
    };
    console.log(_user);
    request(app)
      .patch("/api/v1/users/" + _user._id)
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send(userEditJson)
      .expect("Content-Type", /json/)
      .expect(201, function (err, res) {
        if (err) {
          return done(err);
        }
        let user = res.body.data;
        expect(user.username).to.equal(userEditJson.username);
        expect(user.phone_number).to.equal(_user.phone_number);
        expect(user.role).to.equal(_user.role);
        expect(user.event).to.equal(_user.event);
        expect(user.report).to.equal(_user.report);
        expect(user.camera).to.equal(_user.camera);
        expect(user.configuration).to.equal(_user.configuration);
        // Done
        done();
      });
  });

  //test route for delete user
  it("should send back a JSON object for delete user", function (done) {
    request(app)
      .delete("/api/v1/users/" + _user._id)
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect("Content-Type", /json/)
      .expect(201, function (err, res) {
        if (err) {
          return done(err);
        }
        let result = res.body;
        expect(result.success).to.equal(true);
        // Done
        done();
      });
  });
});

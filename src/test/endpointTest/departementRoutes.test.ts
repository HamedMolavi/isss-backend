import { expect } from "chai";
import request from "supertest";
import Departement from "../../db/mongo/models/department";
import { IDepartment } from "../../interfaces/department.interface";
import app from "../../app/app.Application";

const token = process.env.sample_token;
let _departement: IDepartment;

//create testing for register new departement and edit , delete ,get departement
describe("server run and crud departement", function () {
  //test route for register new departement in DB
  it("should send back a JSON object with departement for create new departement", function (done) {
    request(app)
      .post("/api/v1/departments/")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "office",
      })
      .expect("Content-Type", /json/)
      .expect(201, function (err, res) {
        if (err) {
          return done(err);
        }
        if (res.body.message !== "departement already exists") {
          let response = res.body;
          expect(response.data.name).to.equal("office");
        } else {
          let response = null;
        }
        // Done
        done();
      });
  });

  //get departenet test from DB
  beforeEach(function (done) {
    Departement.findOne(
      {
        name: { $in: ["office", "bank"] },
      },
      function (err: Error, departement: IDepartment) {
        if (err) {
          console.log(err);
        }
        _departement = departement;
        done();
      }
    );
  });

  //test route for get all departements from DB
  it("should send back a JSON object for get all departments", function (done) {
    //test route for get camera in DB
    request(app)
      .get("/api/v1/departments?page=1&perPage=1")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let userResponse = res.body.data;
        expect(userResponse[0]).to.have.property("name");
        // Done
        done();
      });
  });

  //test route for search departements from DB
  it("should send back a JSON object for search departements", function (done) {
    //test route for get camera in DB
    request(app)
      .get("/api/v1/departments?page=1&perPage=1&search=off")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let userResponse = res.body.data;
        expect(userResponse[0]).to.have.property("name");
        // Done
        done();
      });
  });

  //test route for get departement by id from DB
  it("should send back a JSON object for get department with id", function (done) {
    //test route for get camera in DB
    request(app)
      .get("/api/v1/departments/" + _departement._id)
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let userResponse = res.body.data;
        expect(userResponse.name).to.equal(_departement.name);
        // Done
        done();
      });
  });

  //test route for edite departement in DB
  it("should send back a JSON object with id for edit department", function (done) {
    let departementEditJson = {
      name: "bank",
    };
    request(app)
      .patch("/api/v1/departments/" + _departement._id)
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send(departementEditJson)
      .expect("Content-Type", /json/)
      .expect(201, function (err, res) {
        if (err) {
          return done(err);
        }
        let departement = res.body.data;
        expect(departement.name).to.equal(departementEditJson.name);
        // Done
        done();
      });
  });

  //test route for delete departement in DB
  it("should send back a JSON object for delete departement", function (done) {
    request(app)
      .delete("/api/v1/departments/" + _departement._id)
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

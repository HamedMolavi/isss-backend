import { expect } from "chai";
import request from "supertest";
import Departement from "../../db/mongo/models/department";
import Camera from "../../db/mongo/models/camera";
import mongoose from "mongoose";
import Section from "../../db/mongo/models/section";
import { NextFunction } from "express";
import app from "../../apps/app.Application";


const token = process.env.sample_token;

//create testing get all departement file
describe("server run and api departement files",  function () {
  before( function (done : NextFunction) {
    let camera1 = new Camera({
      _id: new mongoose.Types.ObjectId("628dc14af014bc89f0280c46"),
      section_id: new mongoose.Types.ObjectId("628db904f014bc89f0280c41"),
      name: "eng",
      url: "rtsp://{username}:{password}@{ip}:554/media/video2",
      username: "admin",
      password: "Admin12345!",
      ip: "172.10.10.224",
      is_enabled: true,
    });
    let camera2 = new Camera({
      _id: new mongoose.Types.ObjectId("628dc289f014bc89f0280c48"),
      section_id: new mongoose.Types.ObjectId("628db904f014bc89f0280c41"),
      name: "area2",
      url: "rtsp://{username}:{password}@{ip}:554/media/video2",
      username: "admin",
      password: "Admin12345!",
      ip: "172.10.10.240",
      is_enabled: true,
    });
    let camera3 = new Camera({
      _id: new mongoose.Types.ObjectId("628dc28ef014bc89f0280c4a"),
      section_id: new mongoose.Types.ObjectId("628db904f014bc89f0280c41"),
      name: "ai",
      url: "rtsp://{username}:{password}@{ip}:554/media/video2",
      username: "admin",
      password: "Admin12345!",
      ip: "172.10.10.245",
      is_enabled: true,
    });
    let camera4 = new Camera({
      _id: new mongoose.Types.ObjectId("628dc2abf014bc89f0280c4c"),
      section_id: new mongoose.Types.ObjectId("628db904f014bc89f0280c41"),
      name: "door_car",
      url: "rtsp://{username}:{password}@{ip}:554/media/video2",
      username: "admin",
      password: "Admin12345!",
      ip: "172.10.10.236",
      is_enabled: true,
    });
    let camera5 = new Camera({
      _id: new mongoose.Types.ObjectId("628dc2c0f014bc89f0280c4e"),
      section_id: new mongoose.Types.ObjectId("628db904f014bc89f0280c41"),
      name: "door_human",
      url: "rtsp://{username}:{password}@{ip}:554/media/video2",
      username: "admin",
      password: "Admin12345!",
      ip: "172.10.10.238",
      is_enabled: true,
    });
    let camera6 = new Camera({
      _id: new mongoose.Types.ObjectId("628dc2e7f014bc89f0280c52"),
      section_id: new mongoose.Types.ObjectId("628db904f014bc89f0280c40"),
      name: "edari",
      url: "rtsp://{username}:{password}@{ip}:554/media/video2",
      username: "admin",
      password: "Admin12345!",
      ip: "172.10.10.223",
      is_enabled: true,
    });
    let camera7 = new Camera({
      _id: new mongoose.Types.ObjectId("628dc31bf014bc89f0280c54"),
      section_id: new mongoose.Types.ObjectId("628db904f014bc89f0280c40"),
      name: "elec_kar",
      url: "rtsp://{username}:{password}@{ip}:554/media/video2",
      username: "admin",
      password: "Admin12345!",
      ip: "172.10.10.234",
      is_enabled: true,
    });

    let section1 = new Section({
      _id: new mongoose.Types.ObjectId("628db904f014bc89f0280c41"),
      name: "AI",
      department_id: new mongoose.Types.ObjectId("628db754f014bc89f0280c3e"),
    });

    let department = new Departement({
      _id: new mongoose.Types.ObjectId("628db754f014bc89f0280c3e"),
      name: "ENG",
    });
     camera1.save();
     camera2.save();
     camera3.save();
     camera4.save();
     camera5.save();
     camera6.save();
     camera7.save();
     section1.save();
     department.save();
    done();
  });
  // //delete model , camera , section , department after test
  after(function (done:any) {
    Camera.deleteOne({name:"eng"}).exec();
    Camera.deleteOne({name:"door_car"}).exec();
    Camera.deleteOne({name:"door_human"}).exec();
    Camera.deleteOne({name:"area2"}).exec();
    Camera.deleteOne({name:"ai"}).exec();
    Camera.deleteOne({name:"edari"}).exec();
    Camera.deleteOne({name:"elec_kar"}).exec();
    Section.deleteOne({name:"AI"}).exec();
    Departement.deleteOne({ name: "ENG" }).exec();
    done();
  });

  //test route for get all departements file from DB
  it("should send back a JSON object for get all departement file", function (done: NextFunction) {
    //test route for get camera in DB
    request(app)
      .get("/api/v1/departementfiles")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let userResponse: any = res.body.data[0];
        expect(res.body).to.have.property("total");
        expect(res.body).to.have.property("data");
        expect(userResponse._id.toString()).to.equal(
          "628db754f014bc89f0280c3e"
        );
        expect(userResponse.name).to.equal("ENG");
        expect(userResponse.type).to.equal("department");
        expect(userResponse.children[0]._id.toString()).to.equal(
          "628db904f014bc89f0280c41"
        );
        expect(userResponse.children[0].name).to.equal("AI");
        expect(userResponse.children[0].type).to.equal("section");
        expect(userResponse.children[0].children[0]._id.toString()).to.equal(
          "628dc14af014bc89f0280c46"
        );
        expect(userResponse.children[0].children[0].name).to.equal("eng");
        expect(userResponse.children[0].children[0].type).to.equal("camera");
        expect(userResponse.children[0].children[0].url).to.equal(
          "rtsp://{username}:{password}@{ip}:554/media/video2"
        );
        expect(userResponse.children[0].children[0].username).to.equal("admin");
        expect(userResponse.children[0].children[0].password).to.equal(
          "Admin12345!"
        );
        expect(userResponse.children[0].children[0].ip).to.equal(
          "172.10.10.224"
        );
        expect(userResponse.children[0].children[0].is_enabled).to.equal(true);

        expect(userResponse.children[0].children[1]._id).to.equal(
          "628dc289f014bc89f0280c48"
        );
        expect(userResponse.children[0].children[1].name).to.equal("area2");
        expect(userResponse.children[0].children[1].type).to.equal("camera");
        expect(userResponse.children[0].children[1].url).to.equal(
          "rtsp://{username}:{password}@{ip}:554/media/video2"
        );
        expect(userResponse.children[0].children[1].username).to.equal("admin");
        expect(userResponse.children[0].children[1].password).to.equal(
          "Admin12345!"
        );
        expect(userResponse.children[0].children[1].ip).to.equal(
          "172.10.10.240"
        );
        expect(userResponse.children[0].children[1].is_enabled).to.equal(true);
        // Done
        done();
      });
  });
});

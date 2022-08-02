import app from "../../server";
import { expect } from "chai";
import request from "supertest";
import Departement, { IDepartment } from "../../models/department";
import Camera from "../../models/camera";
import mongoose from "mongoose";
import Section from "../../models/section";
import { NextFunction } from "express";

interface IChildrenCamera {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  url: string;
  username: string;
  password: string;
  ip: string;
  is_enabled: boolean;
}

interface IChildrenSection {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  children: IChildrenCamera[];
}

interface IResponseJson {
  _id: mongoose.Types.ObjectId;
  name: string;
  type: string;
  children: IChildrenSection[];
}

const token = process.env.sample_token;

//create testing get all departement file
describe("server run and api departement files", async function (this:any) {
  await this.before(async function (done: NextFunction) {
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
      departement_id: new mongoose.Types.ObjectId("628db754f014bc89f0280c3e"),
    });

    let department = new Departement({
      _id: new mongoose.Types.ObjectId("628db754f014bc89f0280c3e"),
      name: "ENG",
    });
    await camera1.save();
    await camera2.save();
    await camera3.save();
    await camera4.save();
    await camera5.save();
    await camera6.save();
    await camera7.save();
    await section1.save();
    await department.save();
    done();
  });
  //delete model , camera , section , department after test
  this.afterAll(function (done:any) {
    Camera.deleteMany({}).exec();
    Section.deleteMany().exec();
    Departement.deleteOne({ name: "ENG" }).exec();
    done();
  });

  //test route for get all departements file from DB
  it("should send back a JSON object for get all departement file", function (done: NextFunction) {
    //test route for get camera in DB
    request(app)
      .get("/api/v1/departementfiles?page=1&perPage=5")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let userResponse: any = res.body.data;
        console.log(11);
        console.log("respone : " + res.body.data);
        expect(res.body).to.have.property("total");
        expect(res.body).to.have.property("perPage");
        expect(res.body).to.have.property("page");
        expect(res.body).to.have.property("data");
        expect(userResponse._id.toString()).to.equal(
          "628db754f014bc89f0280c3e"
        );
        expect(userResponse.name).to.equal("ENG");
        expect(userResponse.type).to.equal("departement");
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
  }).timeout(10000);
});

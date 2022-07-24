import app from "../../server";
import { expect } from "chai";
import request from "supertest";
import Camera from "../../models/camera";
import mongoose, { Model } from "mongoose";
import Section from "../../models/section";
import Departement from "../../models/departement";

const token = process.env.sample_token;

describe("server run and get report logs", async function () {
  await before(async function (done) {
    let camera = new Camera({
      _id: new mongoose.Types.ObjectId("628dc14af014bc89f0280c46"),
      section_id: new mongoose.Types.ObjectId("628db754f014bc89f0280c3e"),
      name: "mali",
      url: "rtsp://{username}:{password}@{ip}:554/media/video2",
      username: "admin",
      password: "Admin12345!",
      ip: "172.10.10.224",
      is_enabled: true,
    });

    let model = new Model({
      _id: new mongoose.Types.ObjectId("628dcf60f014bc89f0280c64"),
      name: "yolov5",
      category: "human",
      uri: "/home/mohsen/PycharmProjects/FireDetectionPackage/models/YOLOv5m_CrowdHuman.onnx",
    });

    let section = new Section({
      _id: new mongoose.Types.ObjectId("628db904f014bc89f0280c41"),
      name: "AI",
      Department: new mongoose.Types.ObjectId("628db754f014bc89f0280c3e"),
    });

    let department = new Departement({
      _id: new mongoose.Types.ObjectId("628db754f014bc89f0280c3e"),
      name: "ENG",
    });
    await camera.save();
    await model.save();
    await section.save();
    await department.save();
    done();
  });
  //delete model , camera , section , department after test
  this.afterAll(function (done) {
    Model.deleteOne({ category: "human" }).exec();
    Camera.deleteOne({ name: "mali" }).exec();
    Section.deleteOne({ name: "AI" }).exec();
    Departement.deleteOne({ name: "ENG" }).exec();
    done();
  });
  //test get sabotage report sabotage logs with token
  it("should send back a JSON object with all sabotage log report", function (done) {
    request(app)
      .get("/api/v1/reports/sabotage?perPage=10&page=1")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("camera_id");

        done();
      });
  });

  //test search sabotage report sabotage logs with token
  it("should send back a JSON object search sabotage log report", function (done) {
    request(app)
      .get(
        "/api/v1/reports/sabotage?perPage=300&page=1&search=628dc14af014bc89f0280c46"
      )
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        time_start: "05:30",
        time_end: "12:30",
        date_start: "15.04.2021",
        date_end: "15.04.2023",
      })
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("camera_id");

        done();
      });
  });

  //test get fire report fire logs with token
  it("should send back a JSON object with all fire log report", function (done) {
    request(app)
      .get("/api/v1/reports/fire?perPage=200&page=1")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        expect(response.data[0]).to.have.property("camera_id");
        // expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("probability");

        done();
      });
  });

  //test search fire  logs with token
  it("should send back a JSON object search fire log report", function (done) {
    request(app)
      .get(
        "/api/v1/reports/fire?perPage=10&page=1&search=628dc31bf014bc89f0280c54"
      )
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        time_start: "05:30",
        time_end: "12:30",
        date_start: "15.04.2021",
        date_end: "15.04.2023",
        probability: 0.5,
      })
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        console.log(response);
        expect(response.message).to.be.equal("Success");
        //  expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("camera_id");
        expect(response.data[0]).to.have.property("probability");

        done();
      });
  });

  //test get  all face logs with token
  it("should send back a JSON object with all face log report", function (done) {
    request(app)
      .get("/api/v1/reports/face?perPage=10&page=1")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        // expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("camera_id");
        //   expect(response.data[0]).to.have.property('fullName');
        //  expect(response.data[0]).to.have.property('Allowed');

        done();
      });
  });

  //test get fire report face logs with token
  it("should send back a JSON object search face log report", function (done) {
    request(app)
      .get(
        "/api/v1/reports/face?perPage=3&page=1&search=628dc2c0f014bc89f0280c4e"
      )
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        time_start: "05:30",
        time_end: "05:30",
        date_start: "15.04.2021",
        date_end: "15.04.2023",
        personnel_id: "62ada289eac910a0f3f0c42e",
      })
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        //  expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("camera_id");
        //  expect(response.data[0]).to.have.property('fullName');
        //  expect(response.data[0]).to.have.property('Allowed');

        done();
      });
  });

  //test get all report people counting logs with token
  it("should send back a JSON object all people counting log report", function (done) {
    request(app)
      .get("/api/v1/reports/human?perPage=3&page=1")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        //   expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("camera_id");
        expect(response.data[0]).to.have.property("NumberOfPeople");

        done();
      });
  });

  //test get report people counting logs with token
  it("should send back a JSON object search people counting log report", function (done) {
    request(app)
      .get(
        "/api/v1/reports/human?perPage=3&page=1&search=628dc289f014bc89f0280c48"
      )
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        time_start: "05:30",
        time_end: "12:30",
        date_start: "15.04.2021",
        date_end: "15.04.2023",
      })
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        //   expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("camera_id");
        expect(response.data[0]).to.have.property("NumberOfPeople");

        done();
      });
  });

  //test get report all event logs with token
  it("should send back a JSON object all event log report", function (done) {
    request(app)
      .get("/api/v1/reports/event?perPage=10&page=1")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        //   expect(response.da628dc14af014bc89f0280c46ta[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("camera_id");
        expect(response.data[0]).to.have.property("AI");
        expect(response.data[0]).to.have.property("description");

        done();
      });
  });

  //test get report event logs search with camera_id with token
  it("should send back a JSON object search event log with camera_id report", function (done) {
    request(app)
      .get(
        "/api/v1/reports/event?perPage=5&page=1&name=camera&search=628dc14af014bc89f0280c46"
      )
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        //   expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("camera_id");
        expect(response.data[0]).to.have.property("AI");
        expect(response.data[0]).to.have.property("description");

        done();
      });
  });

  //test get report event logs search with model name with token
  it("should send back a JSON object search event log with model name report", function (done) {
    request(app)
      .get("/api/v1/reports/event?perPage=50&page=1&name=ai&search=human")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        //   expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("camera_id");
        expect(response.data[0]).to.have.property("AI");
        expect(response.data[0]).to.have.property("description");

        done();
      });
  });

  //test get report event logs search with camera_id && model name with token
  it("should send back a JSON object search event log with camera_id && model name  report", function (done) {
    request(app)
      .get(
        "/api/v1/reports/event?perPage=5&page=1&name=all&search=human+628dc14af014bc89f0280c46"
      )
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        time_start: "05:30",
        time_end: "12:30",
        date_start: "15.04.2021",
        date_end: "15.04.2023",
      })
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        //   expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("camera_id");
        expect(response.data[0]).to.have.property("AI");
        expect(response.data[0]).to.have.property("description");

        done();
      });
  });

  //test get report all department event with token
  it("should send back a JSON object all department event report", function (done) {
    request(app)
      .get(
        "/api/v1/reportDepartmets?perPage=5&page=1&name=all&search=human+628dc14af014bc89f0280c46"
      )
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        time_start: "05:30",
        time_end: "12:30",
        date_start: "15.04.2021",
        date_end: "15.04.2023",
      })
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        //   expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("sections");
        expect(response.data[0]).to.have.property("AI");
        expect(response.data[0]).to.have.property("description");

        done();
      });
  });

  //test get report department event search by camera_id with token
  it("should send back a JSON object department event report search by camera_id", function (done) {
    request(app)
      .get(
        "/api/v1/reportDepartmets?perPage=10&page=1&name=camera&search=628dc14af014bc89f0280c46"
      )
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        //   expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("sections");
        expect(response.data[0]).to.have.property("AI");
        expect(response.data[0]).to.have.property("description");

        done();
      });
  });

  //test get report department event search by model name with token
  it("should send back a JSON object department event report search by model name", function (done) {
    request(app)
      .get("/api/v1/reportDepartmets?perPage=10&page=1&name=ai&search=human")
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        //   expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("sections");
        expect(response.data[0]).to.have.property("AI");
        expect(response.data[0]).to.have.property("description");

        done();
      });
  });

  //test get report  department event search by camera , model , time with token
  it("should send back a JSON object  department event report search by camera , model , time", function (done) {
    request(app)
      .get(
        "/api/v1/reportDepartmets?perPage=10&page=1&name=all&search=human+628dc14af014bc89f0280c46"
      )
      .set("Content-Type", "application/json")
      .set("Authorization", `Bearer ${token}`)
      .send({
        time_start: "05:30",
        time_end: "12:30",
        date_start: "15.04.2021",
        date_end: "15.04.2023",
      })
      .expect("Content-Type", /json/)
      .expect(200, function (err, res) {
        if (err) {
          return done(err);
        }
        let response = res.body;
        expect(response.message).to.be.equal("Success");
        //   expect(response.data[0]).to.have.property('camera');
        expect(response.data[0]).to.have.property("time");
        expect(response.data[0]).to.have.property("sections");
        expect(response.data[0]).to.have.property("AI");
        expect(response.data[0]).to.have.property("description");

        done();
      });
  }).timeout(20000);
  //  //test get fire report people counting logs with token
  //  it('should send back a JSON object with people counting log report', function (done) {
  //    //todo
  // });
});

import app from "./../../server";
import { expect } from "chai";
import request from "supertest";

const token = process.env.sample_token;
let _file: any;

describe("test upload , dowloand , get list Image", function () {
  // beforeEach(function (done) {
  //     //done();
  // });
  //test route for upload image
  it("should send back a JSON object with file name and location and message", function (done) {
    request(app)
      .post("/api/v1/files/upload/123456789")
      .set("Content-Type", "multipart/form-data")
      .set("Authorization", `Bearer ${token}`)
      .attach("file", "./assets/sample/test.jpg")
      .then(function (res: any) {
        let response = res.body;
        expect(response.status).to.equal(200);
        expect(response.success).to.equal(true);
        expect(response.data).to.have.property("avatar.png");
        expect(response.data).to.have.property(
          "/home/sasan/Desktop/isss-backend/assets/image/123456789123456789.png"
        );
        expect(response.data).to.have.property("message");
      });
    done();
  });

  // //test route for download image
  it('should send back a image picture', function (done) {
      request(app)
          .get('/api/v1/files/download/123456789')
          .set('Content-Type', 'multipart/form-data')
          .set('Authorization', `Bearer ${token}`)
          .then(function (res) {
              expect(res.status).to.equal(200);
              done();
          });
  });

  // //test route for get list image
  it('should send back a jason with url and name image', function (done) {
      request(app)
          .get('/api/v1/files/list')
          .set('Content-Type', 'multipart/form-data')
          .set('Authorization', `Bearer ${token}`)
          .expect(200, function (err, res) {
              if (err) { return done(err); }
              let userResponse = res.body[0];
              expect(userResponse).to.have.property('name');
              expect(userResponse).to.have.property('path');
              expect(userResponse).to.have.property('size');
              // Done
              done();
          });
  });

  // // //test route for upload image in redis
  // it('should send back a JSON object with message Uploaded the file successfully in redis', function (done) {
  //     request(app)
  //         .post('/api/v1/files/redis?id=123456789')
  //         .set('Content-Type', 'multipart/form-data')
  //         .set('Authorization', `Bearer ${token}`)
  //         .attach('file', './assets/sample/test.jpg')
  //         .then(function (res) {
  //             let response = res.body.message;
  //             expect(res.status).to.equal(201);
  //             expect(response).to.equal("Uploaded the file successfully");
  //             done();
  //         });
  // });

  // // //test route for verify image in redis
  // it('should send back a JSON object with message Verified the file successfully in redis', function (done) {
  //     request(app)
  //         .post('/api/v1/files/verify')/api/v1/files/upload/123456789
  //             done();
  //         });
  // });
});

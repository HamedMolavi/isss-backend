import app from '../../server.ts';
import { expect } from 'chai';
import request from 'supertest';
import Camera from '../../db/mongo/models/camera.js';
import Model from '../../db/mongo/models/model.js';
import Section from '../../db/mongo/models/section.js';
import Departement from '../../db/mongo/models/department.js';
import Personnel from '../../db/mongo/models/personnel.js';
import CarBrand from '../../db/mongo/models/carBrand.js';
import CarColor from '../../db/mongo/models/carColor.js';
import { NextFunction } from 'express';
import mongoose from 'mongoose';
import Car from '../../db/mongo/models/car.js';

const token = process.env.sample_token;

describe('server run and get report logs', function () {
	before(function (done: NextFunction) {
		let camera1 = new Camera({
			_id: new mongoose.Types.ObjectId('628dc14af014bc89f0280c46'),
			section_id: new mongoose.Types.ObjectId('628db754f014bc89f0280c3e'),
			name: 'mali',
			url: 'rtsp://{username}:{password}@{ip}:554/media/video2',
			username: 'admin',
			password: 'Admin12345!',
			ip: '172.10.10.224',
			is_enabled: true
		});

		let camera2 = new Camera({
			_id: new mongoose.Types.ObjectId('628dc332f014bc89f0280c56'),
			section_id: new mongoose.Types.ObjectId('628db904f014bc89f0280c40'),
			name: 'eng_door',
			url: 'rtsp://{username}:{password}@{ip}:554/media/video2',
			username: 'admin',
			password: 'Admin12345!',
			ip: '172.10.10.221',
			is_enabled: true
		});

		let model = new Model({
			_id: new mongoose.Types.ObjectId('628dcf60f014bc89f0280c64'),
			name: 'yolov5',
			category: 'human',
			uri: '/home/mohsen/PycharmProjects/FireDetectionPackage/models/YOLOv5m_CrowdHuman.onnx'
		});

		let section = new Section({
			_id: new mongoose.Types.ObjectId('628db904f014bc89f0280c41'),
			name: 'AI',
			department_id: new mongoose.Types.ObjectId('628db754f014bc89f0280c3e')
		});

		let department = new Departement({
			_id: new mongoose.Types.ObjectId('628db754f014bc89f0280c3e'),
			name: 'ENG'
		});

		let personnel1 = new Personnel({
			_id: new mongoose.Types.ObjectId('628df9fbf014bc89f0280c7a'),
			first_name: 'Mohsen',
			last_name: 'Fatehifar',
			national_code: '123456789',
			email: 'test@gmail.com',
			phone_number: '09121234567',
			job_id: new mongoose.Types.ObjectId('628df9fbf014bc89f0280c7a'),
			personnel_code: '123456789',
			section_id: new mongoose.Types.ObjectId('628db904f014bc89f0280c41'),
			camera_whitelist: ['628dc332f014bc89f0280c56', '628dc14af014bc89f0280c46'],
			is_active: true,
			is_employee: true,
			is_dismissed: true,
			create_date: Date.now()
		});

		let personnel2 = new Personnel({
			_id: new mongoose.Types.ObjectId('628dfa6ff014bc89f0280c84'),
			first_name: 'Javad',
			last_name: 'Zamani',
			national_code: '123456789',
			email: 'test@gmail.com',
			phone_number: '09121234567',
			job_id: new mongoose.Types.ObjectId('628df9fbf014bc89f0280c7a'),
			personnel_code: '123456789',
			section_id: new mongoose.Types.ObjectId('628db904f014bc89f0280c41'),
			camera_whitelist: ['628dc332f014bc89f0280c56', '628dc14af014bc89f0280c46'],
			is_active: true,
			is_employee: true,
			is_dismissed: true,
			create_date: Date.now()
		});

		let personnel3 = new Personnel({
			_id: new mongoose.Types.ObjectId('628dfa4df014bc89f0280c80'),
			first_name: 'Zeinab',
			last_name: 'Mousavian',
			national_code: '123456789',
			email: 'test@gmail.com',
			phone_number: '09121234567',
			job_id: new mongoose.Types.ObjectId('628df9fbf014bc89f0280c7a'),
			personnel_code: '123456789',
			section_id: new mongoose.Types.ObjectId('628db904f014bc89f0280c41'),
			camera_whitelist: ['628dc332f014bc89f0280c56', '628dc14af014bc89f0280c46'],
			is_active: true,
			is_employee: true,
			is_dismissed: true,
			create_date: Date.now()
		});

		let carBrand1 = new CarBrand({
			_id: new mongoose.Types.ObjectId('62943e1c2008add06c796aa3'),
			name: 'lexus'
		});

		let carBrand2 = new CarBrand({
			_id: new mongoose.Types.ObjectId('62943e1c2008add06c796aa8'),
			name: 'pars'
		});

		let carBrand3 = new CarBrand({
			_id: new mongoose.Types.ObjectId('62943e1c2008add06c796aa7'),
			name: 'dena'
		});

		let carColor1 = new CarColor({
			_id: new mongoose.Types.ObjectId('62935b82b465fdf3f2b8084f'),
			name: 'white'
		});

		let carColor2 = new CarColor({
			_id: new mongoose.Types.ObjectId('62935b82b465fdf3f2b8084e'),
			name: 'black'
		});

		let carColor3 = new CarColor({
			_id: new mongoose.Types.ObjectId('62935b82b465fdf3f2b8084d'),
			name: 'yellow'
		});

		let car1 = new Car({
			_id: new mongoose.Types.ObjectId('6293643def1b3ac103e4cb14'),
			owner: new mongoose.Types.ObjectId('628df9fbf014bc89f0280c7a'),
			brand_id: new mongoose.Types.ObjectId('62943e1c2008add06c796aa3'),
			color_id: new mongoose.Types.ObjectId('62935b82b465fdf3f2b8084e'),
			number_plate: '68U54419',
			camera_whitelist: []
		});

		let car2 = new Car({
			_id: new mongoose.Types.ObjectId('6293643def1b3ac103e4cb15'),
			owner: new mongoose.Types.ObjectId('628dfa6ff014bc89f0280c84'),
			brand_id: new mongoose.Types.ObjectId('62943e1c2008add06c796aa8'),
			color_id: new mongoose.Types.ObjectId('62935b82b465fdf3f2b8084f'),
			number_plate: '41X56655',
			camera_whitelist: []
		});

		let car3 = new Car({
			_id: new mongoose.Types.ObjectId('6293643def1b3ac103e4cb16'),
			owner: new mongoose.Types.ObjectId('628dfa4df014bc89f0280c80'),
			brand_id: new mongoose.Types.ObjectId('62943e1c2008add06c796aa7'),
			color_id: new mongoose.Types.ObjectId('62935b82b465fdf3f2b8084d'),
			number_plate: '15X54185',
			camera_whitelist: []
		});

		camera1.save();
		camera2.save();
		model.save();
		section.save();
		department.save();
		personnel1.save();
		personnel2.save();
		personnel3.save();
		carBrand1.save();
		carBrand2.save();
		carBrand3.save();
		carColor1.save();
		carColor2.save();
		carColor3.save();
		car1.save();
		car2.save();
		car3.save();
		done();
	});
	//delete model , camera , section , department after test
	after(function (done: NextFunction) {
		Model.findOneAndDelete({ category: 'human' }).exec();
		Camera.findOneAndDelete({ name: 'eng_door' }).exec();
		Camera.findOneAndDelete({ name: 'mali' }).exec();
		Camera.findOneAndDelete({ name: 'mali' }).exec();
		Camera.findOneAndDelete({ name: 'mali' }).exec();
		Camera.findOneAndDelete({ name: 'mali' }).exec();
		Camera.findOneAndDelete({ name: 'mali' }).exec();
		Section.findOneAndDelete({ name: 'AI' }).exec();
		Departement.findOneAndDelete({ name: 'ENG' }).exec();
		Personnel.findOneAndDelete({ first_name: 'Mohsen' }).exec();
		Personnel.findOneAndDelete({ first_name: 'Javad' }).exec();
		Personnel.findOneAndDelete({ first_name: 'Zeinab' }).exec();
		CarBrand.findOneAndDelete({ first_name: 'lexus' }).exec();
		CarBrand.findOneAndDelete({ first_name: 'pars' }).exec();
		CarBrand.findOneAndDelete({ first_name: 'dena' }).exec();
		CarColor.findOneAndDelete({ first_name: 'white' }).exec();
		CarColor.findOneAndDelete({ first_name: 'black' }).exec();
		CarColor.findOneAndDelete({ first_name: 'yellow' }).exec();
		Car.findOneAndDelete({ number_plate: '68U54419' }).exec();
		Car.findOneAndDelete({ number_plate: '41X56655' }).exec();
		Car.findOneAndDelete({ number_plate: '15X54185' }).exec();
		done();
	});
	//test get sabotage report sabotage logs with token
	it('should send back a JSON object with all sabotage log report', function (done) {
		request(app)
			.post('/api/v1/reports/sabotage?perPage=3&page=1')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect('Content-Type', /json/)
			.expect(200, function (err, res) {
				if (err) {
					done(err);
				}
				let response = res.body;
				expect(response.success).to.be.equal(true);
				expect(response.data[0]).to.have.property('time');
				expect(response.data[0]).to.have.property('camera_id');

				done();
			});
	});

	//test search sabotage report sabotage logs with token
	it('should send back a JSON object search sabotage log report', function (done) {
		request(app)
			.post('/api/v1/reports/sabotage?perPage=10&page=1&search=yes')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.send({
				time_start: '05:30',
				time_end: '12:30',
				date_start: '04/15/2021',
				date_end: '04/15/2023',
				cameras: ['628dc14af014bc89f0280c46', '628dc332f014bc89f0280c56']
			})
			.expect('Content-Type', /json/)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let response = res.body;
				expect(response.success).to.be.equal(true);
				expect(response.data[0]).to.have.property('time');
				expect(response.data[0]).to.have.property('camera_id');

				done();
			});
	});

	//test get fire report fire logs with token
	it('should send back a JSON object with all fire log report', function (done) {
		request(app)
			.post('/api/v1/reports/fire?perPage=200&page=1')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect('Content-Type', /json/)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let response = res.body;
				expect(response.success).to.be.equal(true);
				expect(response.data[0]).to.have.property('camera_id');
				// expect(response.data[0]).to.have.property('camera');
				expect(response.data[0]).to.have.property('time');
				expect(response.data[0]).to.have.property('probability');

				done();
			});
	});

	//test search fire  logs with token
	it('should send back a JSON object search fire log report', function (done) {
		request(app)
			.post('/api/v1/reports/fire?perPage=10&page=1&search=yes')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.send({
				time_start: '05:30',
				time_end: '12:30',
				date_start: '4/15/2021',
				date_end: '4/15/2023',
				probability: [0.5, 1],
				cameras: ['628dc31bf014bc89f0280c54', '628dc2cff014bc89f0280c50']
			})
			.expect('Content-Type', /json/)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let response = res.body;
				expect(response.success).to.be.equal(true);
				//  expect(response.data[0]).to.have.property('camera');
				expect(response.data[0]).to.have.property('time');
				expect(response.data[0]).to.have.property('camera_id');
				expect(response.data[0]).to.have.property('probability');

				done();
			});
	});

	//test get  all face logs with token
	it('should send back a JSON object with all face log report', function (done) {
		request(app)
			.post('/api/v1/reports/face?perPage=10&page=1')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect('Content-Type', /json/)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let response = res.body;
				expect(response.success).to.be.equal(true);
				// expect(response.data[0]).to.have.property('camera');
				expect(response.data[0]).to.have.property('time');
				expect(response.data[0]).to.have.property('camera_id');
				//   expect(response.data[0]).to.have.property('fullName');
				//  expect(response.data[0]).to.have.property('Allowed');

				done();
			});
	});

	//test get fire report face logs with token
	it('should send back a JSON object search face log report', function (done) {
		request(app)
			.post('/api/v1/reports/face?perPage=3&page=1&search=yes')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.send({
				time_start: '05:30',
				time_end: '05:30',
				date_start: '4/15/2021',
				date_end: '4/15/2023',
				cameras: ['628dc2c0f014bc89f0280c4e', '628dc332f014bc89f0280c56']
			})
			.expect('Content-Type', /json/)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let response = res.body;
				expect(response.success).to.be.equal(true);
				//  expect(response.data[0]).to.have.property('camera');
				expect(response.data[0]).to.have.property('time');
				expect(response.data[0]).to.have.property('camera_id');
				//  expect(response.data[0]).to.have.property('fullName');
				//  expect(response.data[0]).to.have.property('Allowed');

				done();
			});
	});

	//test get all report people counting logs with token
	it('should send back a JSON object all people counting log report', function (done) {
		request(app)
			.post('/api/v1/reports/human?perPage=3&page=1')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect('Content-Type', /json/)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let response = res.body;
				expect(response.success).to.be.equal(true);
				//   expect(response.data[0]).to.have.property('camera');
				expect(response.data[0]).to.have.property('time');
				expect(response.data[0]).to.have.property('camera_id');
				expect(response.data[0]).to.have.property('numberOfPeople');
				expect(response.data[0]).to.have.property('allowed');

				done();
			});
	});

	//test get report people counting logs with token
	it('should send back a JSON object search people counting log report', function (done) {
		request(app)
			.post('/api/v1/reports/human?perPage=3&page=1&search=yes')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.send({
				time_start: '05:30',
				time_end: '12:30',
				date_start: '4/15/2021',
				date_end: '4/15/2023',
				cameras: ['628dc289f014bc89f0280c48'],
				humanCounts: [1, 10]
			})
			.expect('Content-Type', /json/)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let response = res.body;
				expect(response.success).to.be.equal(true);
				//   expect(response.data[0]).to.have.property('camera');
				expect(response.data[0]).to.have.property('time');
				expect(response.data[0]).to.have.property('camera_id');
				expect(response.data[0]).to.have.property('NumberOfPeople');

				done();
			});
	});

	//test get report all event logs with token
	// it("should send back a JSON object all event log report", function (done) {
	//   request(app)
	//     .post("/api/v1/reports/event?perPage=10&page=1")
	//     .set("Content-Type", "application/json")
	//     .set("Authorization", `Bearer ${token}`)
	//     .expect("Content-Type", /json/)
	//     .expect(200, function (err, res) {
	//       if (err) {
	//         return done(err);
	//       }
	//       let response = res.body;
	//       expect(response.success).to.be.equal(true);
	//       //   expect(response.da628dc14af014bc89f0280c46ta[0]).to.have.property('camera');
	//       expect(response.data[0]).to.have.property("time");
	//       expect(response.data[0]).to.have.property("camera_id");
	//       expect(response.data[0]).to.have.property("AI");
	//       expect(response.data[0]).to.have.property("description");

	//       done();
	//     });
	// });

	//test get report event logs search with camera_id with token
	// it("should send back a JSON object search event log with camera_id report", function (done) {
	//   request(app)
	//     .post(
	//       "/api/v1/reports/event?perPage=5&page=1&name=camera&search=628dc14af014bc89f0280c46"
	//     )
	//     .set("Content-Type", "application/json")
	//     .set("Authorization", `Bearer ${token}`)
	//     .expect("Content-Type", /json/)
	//     .expect(200, function (err, res) {
	//       if (err) {
	//         return done(err);
	//       }
	//       let response = res.body;
	//       expect(response.success).to.be.equal(true);
	//       //   expect(response.data[0]).to.have.property('camera');
	//       expect(response.data[0]).to.have.property("time");
	//       expect(response.data[0]).to.have.property("camera_id");
	//       expect(response.data[0]).to.have.property("AI");
	//       expect(response.data[0]).to.have.property("description");

	//       done();
	//     });
	// });

	//test get report event logs search with model name with token
	// it("should send back a JSON object search event log with model name report", function (done) {
	//   request(app)
	//     .post("/api/v1/reports/event?perPage=50&page=1&name=ai&search=human")
	//     .set("Content-Type", "application/json")
	//     .set("Authorization", `Bearer ${token}`)
	//     .expect("Content-Type", /json/)
	//     .expect(200, function (err, res) {
	//       if (err) {
	//         return done(err);
	//       }
	//       let response = res.body;
	//       expect(response.success).to.be.equal(true);
	//       //   expect(response.data[0]).to.have.property('camera');
	//       expect(response.data[0]).to.have.property("time");
	//       expect(response.data[0]).to.have.property("camera_id");
	//       expect(response.data[0]).to.have.property("AI");
	//       expect(response.data[0]).to.have.property("description");

	//       done();
	//     });
	// });

	//test get report event logs search with camera_id && model name with token
	// it("should send back a JSON object search event log with camera_id && model name  report", function (done) {
	//   request(app)
	//     .post(
	//       "/api/v1/reports/event?perPage=5&page=1&name=all&search=human+628dc14af014bc89f0280c46"
	//     )
	//     .set("Content-Type", "application/json")
	//     .set("Authorization", `Bearer ${token}`)
	//     .send({
	//       time_start: "05:30",
	//       time_end: "12:30",
	//       date_start: "4/15/2021",
	//       date_end: "4/15/2023",
	//     })
	//     .expect("Content-Type", /json/)
	//     .expect(200, function (err, res) {
	//       if (err) {
	//         return done(err);
	//       }
	//       let response = res.body;
	//       expect(response.success).to.be.equal(true);
	//       //   expect(response.data[0]).to.have.property('camera');
	//       expect(response.data[0]).to.have.property("time");
	//       expect(response.data[0]).to.have.property("camera_id");
	//       expect(response.data[0]).to.have.property("AI");
	//       expect(response.data[0]).to.have.property("description");

	//       done();
	//     });
	// });

	//test get report all department event with token
	// it("should send back a JSON object all department event report", function (done) {
	//   request(app)
	//     .post(
	//       "/api/v1/reportDepartmets?perPage=5&page=1&name=all&search=human+628dc14af014bc89f0280c46"
	//     )
	//     .set("Content-Type", "application/json")
	//     .set("Authorization", `Bearer ${token}`)
	//     .send({
	//       time_start: "05:30",
	//       time_end: "12:30",
	//       date_start: "4/15/2021",
	//       date_end: "4/15/2023",
	//     })
	//     .expect("Content-Type", /json/)
	//     .expect(200, function (err, res) {
	//       if (err) {
	//         return done(err);
	//       }
	//       let response = res.body;
	//       expect(response.success).to.be.equal(true);
	//       //   expect(response.data[0]).to.have.property('camera');
	//       expect(response.data[0]).to.have.property("time");
	//       expect(response.data[0]).to.have.property("sections");
	//       expect(response.data[0]).to.have.property("AI");
	//       expect(response.data[0]).to.have.property("description");

	//       done();
	//     });
	// });

	//test get report department event search by camera_id with token
	// it("should send back a JSON object department event report search by camera_id", function (done) {
	//   request(app)
	//     .post(
	//       "/api/v1/reportDepartmets?perPage=10&page=1&name=camera&search=628dc14af014bc89f0280c46"
	//     )
	//     .set("Content-Type", "application/json")
	//     .set("Authorization", `Bearer ${token}`)
	//     .expect("Content-Type", /json/)
	//     .expect(200, function (err, res) {
	//       if (err) {
	//         return done(err);
	//       }
	//       let response = res.body;
	//       expect(response.success).to.be.equal(true);
	//       //   expect(response.data[0]).to.have.property('camera');
	//       expect(response.data[0]).to.have.property("time");
	//       expect(response.data[0]).to.have.property("sections");
	//       expect(response.data[0]).to.have.property("AI");
	//       expect(response.data[0]).to.have.property("description");

	//       done();
	//     });
	// });

	//test get report department event search by model name with token
	// it("should send back a JSON object department event report search by model name", function (done) {
	//   request(app)
	//     .post("/api/v1/reportDepartmets?perPage=10&page=1&name=ai&search=human")
	//     .set("Content-Type", "application/json")
	//     .set("Authorization", `Bearer ${token}`)
	//     .expect("Content-Type", /json/)
	//     .expect(200, function (err, res) {
	//       if (err) {
	//         return done(err);
	//       }
	//       let response = res.body;
	//       expect(response.success).to.be.equal(true);
	//       //   expect(response.data[0]).to.have.property('camera');
	//       expect(response.data[0]).to.have.property("time");
	//       expect(response.data[0]).to.have.property("sections");
	//       expect(response.data[0]).to.have.property("AI");
	//       expect(response.data[0]).to.have.property("description");

	//       done();
	//     });
	// });

	// //test get report  department event search by camera , model , time with token
	// it("should send back a JSON object  department event report search by camera , model , time", function (done) {
	//   request(app)
	//     .get(
	//       "/api/v1/reportDepartmets?perPage=10&page=1&name=all&search=human+628dc14af014bc89f0280c46"
	//     )
	//     .set("Content-Type", "application/json")
	//     .set("Authorization", `Bearer ${token}`)
	//     .send({
	//       time_start: "05:30",
	//       time_end: "12:30",
	//       date_start: "4/15/2021",
	//       date_end: "4/15/2023",
	//     })
	//     .expect("Content-Type", /json/)
	//     .expect(200, function (err, res) {
	//       if (err) {
	//         return done(err);
	//       }
	//       let response = res.body;
	//       expect(response.message).to.be.equal("Success");
	//       //   expect(response.data[0]).to.have.property('camera');
	//       expect(response.data[0]).to.have.property("time");
	//       expect(response.data[0]).to.have.property("sections");
	//       expect(response.data[0]).to.have.property("AI");
	//       expect(response.data[0]).to.have.property("description");

	//       done();
	//     });
	// });
	//test get plate log report plate logs with token
	it('should send back a JSON object with all plate log report', function (done) {
		request(app)
			.post('/api/v1/reports/plate?perPage=50&page=1')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.expect('Content-Type', /json/)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let response = res.body;
				expect(response.success).to.be.equal(true);
				expect(response.data[0]).to.have.property('time');
				expect(response.data[0]).to.have.property('camera_id');
				expect(response.data[0]).to.have.property('camera');
				expect(response.data[0]).to.have.property('plate_number');
				expect(response.data[0].plate_number).to.have.property('first');
				expect(response.data[0].plate_number).to.have.property('second');
				expect(response.data[0].plate_number).to.have.property('third');
				expect(response.data[0].plate_number).to.have.property('fourth');
				expect(response.data[0].plate_number).to.have.property('fifth');
				expect(response.data[0]).to.have.property('owner');
				expect(response.data[0]).to.have.property('color');
				expect(response.data[0]).to.have.property('brand');
				expect(response.data[0]).to.have.property('allowed');

				done();
			});
	});

	//test get plate log report search plate logs with token
	it('should send back a JSON object with search plate log report', function (done) {
		request(app)
			.post('/api/v1/reports/plate?perPage=50&page=1&search=yes')
			.set('Content-Type', 'application/json')
			.set('Authorization', `Bearer ${token}`)
			.send({
				allowed: 'true',
				car_brand: ['62943e1c2008add06c796aa3', '62943e1c2008add06c796aa8', '62943e1c2008add06c796aa7'],
				car_color: ['62935b82b465fdf3f2b8084f', '62935b82b465fdf3f2b8084e', '62935b82b465fdf3f2b8084d'],
				date_start: '4/15/2019',
				date_end: '4/15/2023',
				owner: ['628dfa6ff014bc89f0280c84', '628df9fbf014bc89f0280c7a', '628dfa4df014bc89f0280c80'],
				time_end: '05:00',
				time_start: '20:00',
				cameras: ['628dc332f014bc89f0280c56', '628dc14af014bc89f0280c46']
			})
			.expect('Content-Type', /json/)
			.expect(200, function (err, res) {
				if (err) {
					return done(err);
				}
				let response = res.body;
				expect(response.success).to.be.equal(true);
				expect(response.data[0]).to.have.property('time');
				expect(response.data[0]).to.have.property('camera_id');
				expect(response.data[0]).to.have.property('camera');
				expect(response.data[0]).to.have.property('plate_number');
				expect(response.data[0].plate_number).to.have.property('first');
				expect(response.data[0].plate_number).to.have.property('second');
				expect(response.data[0].plate_number).to.have.property('third');
				expect(response.data[0].plate_number).to.have.property('fourth');
				expect(response.data[0].plate_number).to.have.property('fifth');
				expect(response.data[0]).to.have.property('owner');
				expect(response.data[0]).to.have.property('color');
				expect(response.data[0]).to.have.property('brand');
				expect(response.data[0]).to.have.property('allowed');

				done();
			});
	});
});

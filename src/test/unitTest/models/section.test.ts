import { expect } from 'chai';
import { Disconnect } from '../../../db/mongo/connect.database';
import mongoose from 'mongoose';
import { dbUri } from '../../../server.ts';

//test section models
describe('section', function () {
	let Section: any;
	//connect to DB before test
	before(function (done) {
		//connect to DB
		mongoose.connect(dbUri);
		//listen for connection events
		mongoose.connection.once('connected', () => {
			mongoose.connection.db
				.dropDatabase()
				.then(() => {
					require('./../../../models/section').registerModels;
					// This is the right model because registerModels set it up for us.
					Section = mongoose.model('Section');
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
	//test section model
	describe('register section', function () {
		//create section model
		it('should save section in db', function (done) {
			var section = new Section({
				name: 'offece',
				department_id: new mongoose.Types.ObjectId('6283724be1996b883080a495')
			});
			//test this section model
			section
				.save()
				.then(() => {
					expect(section.name).to.equal('offece');
					expect(section.department_id.toString()).to.equal('6283724be1996b883080a495');
					done();
				})
				.catch((err: Error) => {
					done(err);
				});
		});
	});
});

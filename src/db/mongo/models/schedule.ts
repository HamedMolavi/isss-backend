import mongoose, { Schema } from 'mongoose';
import { ISchedule } from '../../../types/interfaces/schedule.interface';

//create Schedule with schema for save in DB
const ScheduleSchema: Schema<ISchedule> = new Schema(
	{
		start_cron: { type: String, required: true },
		stop_cron: { type: String, required: true },
		model_camera_id: {
			type: Schema.Types.ObjectId,
			ref: 'ModelToCamera',
			required: true
		},
		config: {
			timeDuplicationDiagnoses: { type: Number, default: 0 },
			threshold: { type: Number, default: 0 },
			min_people: { type: Number, default: 0 },
			max_people: { type: Number, default: 0 },
			zones: {
				type: Array<[[number, number], [number, number], [number, number], [number, number]]>,
				default: [
					[
						[0, 0],
						[1, 0],
						[1, 1],
						[0, 1]
					]
				]
			},
			justHuman: { type: Boolean, default: false },
			with_full_frame: { type: Boolean, default: true },
			update_full_frame: { type: Boolean, default: true },
			state: { type: String, default: 'both' }
		},
		description: { type: String, required: true },
		users_alert: Array<{
			type: Schema.Types.ObjectId;
			ref: 'User';
			required: false;
		}>,
		sms: { type: { send: Boolean, active: Boolean }, default: { send: false, mute: false } },
		alert: { type: { send: Boolean, active: Boolean }, default: { send: false, mute: false } },
		is_running: { type: Boolean, default: false }
	},
	{
		collection: 'Schedule'
	}
);

//get Schedule data json
ScheduleSchema.methods.toJSON = function () {
	return {
		_id: this._id,
		start_cron: {
			min: this.start_cron.split(' ')[0],
			hour: this.start_cron.split(' ')[1],
			dow: this.start_cron.split(' ')[4].split(',') ?? ['*']
		},
		stop_cron: {
			min: this.stop_cron.split(' ')[0],
			hour: this.stop_cron.split(' ')[1],
			dow: this.stop_cron.split(' ')[4].split(',') ?? ['*']
		},
		model_camera_id: this.model_camera_id,
		config: {
			timeDuplicationDiagnoses: this.config.timeDuplicationDiagnoses ?? 0,
			threshold: this.config?.threshold != 0 ? this.config?.threshold * 100 : 0,
			zones: this.config.zones ?? null,
			min_people: this.config.min_people ?? 0,
			max_people: this.config.max_people ?? 0,
			justHuman: this.config.justHuman,
			with_full_frame: this.config?.with_full_frame ?? true,
			update_full_frame: this.config?.update_full_frame ?? true,
			state: this.config.state
		},
		description: this.description,
		users_alert: this.users_alert,
		sms: this.sms,
		alert: this.alert,
		is_running: this.is_running
	};
};

// Compile model from schema
const Schedule = mongoose.model('Schedule', ScheduleSchema);

export default Schedule;

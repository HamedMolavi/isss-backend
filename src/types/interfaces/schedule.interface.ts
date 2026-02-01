import { Document, Schema } from 'mongoose';

//define schedule type
export interface ISchedule extends Document {
	_id: Schema.Types.ObjectId;
	model_camera_id: Schema.Types.ObjectId;
	start_cron: string;
	stop_cron: string;
	config: IConfig;
	description: string;
	users_alert: [Schema.Types.ObjectId];
	sms: { send: boolean; active: boolean };
	alert: { send: boolean; active: boolean };
	state: { send: string; active: boolean };
	is_running: boolean;
}
//define config type
interface IConfig {
	timeDuplicationDiagnoses: number;
	threshold: number;
	min_people: number;
	max_people: number;
	zones: Array<[[number, number], [number, number], [number, number], [number, number]]>;
	lines: Array<{
		points?: [[number, number], [number, number], [number, number], [number, number]]; // Polygon zone (required for zone_exit)
		count_mode: 'zone_exit' | 'two_line'; // 'zone_exit' for exit-only counting, 'two_line' for entry/exit lines
		enabled: boolean;
		entry_line?: {
			start: [number, number];
			end: [number, number];
		}; // Required for two_line mode
		exit_line?: {
			start: [number, number];
			end: [number, number];
		}; // Required for two_line mode
	}>;
	justHuman: boolean;
	state: string;
	with_full_frame: boolean;
	update_full_frame: boolean;
}

//define type of schedule for request body
export interface IGetParams {
	_id: Schema.Types.ObjectId;
	model_camera_id: Schema.Types.ObjectId;
	start: string;
	stop: string;
	dayOfWeek: number[];
	threshold: number;
	zones: Array<[[number, number], [number, number], [number, number], [number, number]]>;
	montionDetection: boolean;
	min_people: number;
	max_people: number;
	timeDuplicationDiagnoses: number;
	description: string;
	justHuman: boolean;
	state: string;
	users_alert: Schema.Types.ObjectId[];
	sms: { send: boolean; active: boolean };
	alert: { send: boolean; active: boolean };
}

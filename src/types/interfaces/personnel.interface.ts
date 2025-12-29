import { Document, Schema } from 'mongoose';

//define personnel type
export interface IPersonnel extends Document {
	_id: Schema.Types.ObjectId;
	first_name: string;
	last_name: string;
	national_code: string;
	email: string;
	phone_number: string;
	job_id: Schema.Types.ObjectId;
	personnel_code: string;
	camera_whitelist: Schema.Types.ObjectId[];
	department_whitelist: Schema.Types.ObjectId[];
	section_whitelist: Schema.Types.ObjectId[];
	schedule_whitelist: Schema.Types.ObjectId[];
	allowed_pass: { start: number; end: number } | undefined;
	tracked: boolean;
	create_date: Date;
	alert: boolean;
	person_type: 'normal' | 'guest' | 'hostile' | 'client_buyer' | 'client_seller';
	toName: () => string;
	toJSON: () => Promise<IPersonnelResponse>;
}

// Response type with computed fields
export interface IPersonnelResponse {
	_id: Schema.Types.ObjectId;
	first_name: string;
	last_name: string;
	national_code: string;
	email: string;
	phone_number: string;
	job_id: Schema.Types.ObjectId;
	personnel_code: string;
	camera_whitelist: Schema.Types.ObjectId[];
	image_id?: Schema.Types.ObjectId;
	create_date: Date;
	tracked: boolean;
	allowed_pass: { start: number; end: number } | undefined;
	alert: boolean;
	image_url: string; // Virtual field - computed from file system
	avatar: string; // Virtual field - base64 image data
	person_type: 'normal' | 'guest' | 'hostile' | 'client_buyer' | 'client_seller';
}

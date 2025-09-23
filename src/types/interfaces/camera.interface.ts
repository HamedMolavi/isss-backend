import mongoose from 'mongoose';

//define camera type
export interface ICamera extends Document {
	_id: mongoose.Types.ObjectId;
	section_id: mongoose.Types.ObjectId;
	network: string;
	url: string;
	nvr: string;
	ip: string;
	damaged: boolean;
	name: string;
	username: string;
	password: string;
	is_enabled: boolean;
	create_date: Date;
	camera_type: string | null;
	nvr_type: string | null;
}

export interface ICameraInfo {
	[key: string]: string | undefined;
	ip?: string | undefined;
	username?: string | undefined;
	password?: string | undefined;
	nvr?: string | undefined;
}

export const CameraInfoKeys: ICameraInfo = {
	ip: 'true',
	username: 'true',
	password: 'true',
	nvr: 'true'
};

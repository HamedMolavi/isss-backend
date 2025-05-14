import { Types } from 'mongoose';
import { ICar } from './car.interface';
import { IDepartment } from './department.interface';
import { IPersonnel } from './personnel.interface';
import { ISection } from './section.interface';

export type sabotageLogResult = Array<{ camera_id: string; camera: string; time: string; video: string }>;

export type plateLogResult = Array<{
	camera_type: string;
	camera_id: string;
	camera: string;
	time: string;
	plate_number: { first: string; second: string; third: string; fourth: string; fifth: string };
	owner: string;
	color: string;
	brand: string;
	allowed: boolean;
	video: string;
}>;
export type humanLogResult = Array<{
	camera_id: string;
	camera_type: string;
	camera: string;
	time: string;
	numberOfPeople: string;
	allowed: boolean;
	video: string;
}>;
export type fireLogResult = Array<{
	camera_id: string;
	camera: string;
	time: string;
	probability: string;
	video: string;
}>;
export type faceLogResult = Array<{
	camera_type: string;
	camera_id: string;
	camera: string;
	fullName: string;
	time: string;
	allowed: boolean;
	video: string;
}>;

export type eventLogResult = Array<{
	camera_type: string;
	title: string;
	type: string;
	cause: string;
	camera_id: string;
	personnel: string;
	personnel_code: string;
	peopleCounting: string;
	plate_number: string;
	owner: string;
	name: string;
	time: string;
	ai: string;
	section: string;
	department: string;
	description: string;
	video: string;
}>;
export type eventDepartmentLogResult = Array<{
	department: IDepartment & { _id: Types.ObjectId };
	sections: (ISection & { _id: Types.ObjectId })[];
	time: Date;
	AI: string;
	description: string;
}>;
///////////////////////////////////////////////////
//define type fore input function extended description
export type Description = {
	description: string;
	camera: string;
	section: string;
	departement: string;
	log: any;
	perssonels: IPersonnel[];
	cars: ICar[];
};

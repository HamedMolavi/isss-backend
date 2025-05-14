import { stringifyPlate } from '../../../tools/car.tools';

export interface IPlate {
	track_id?: number;
	candidate_ocr: string;
	saspicious_ocr: string;
	track_bbox: number[];
	crop: string;
	speed: string;
	color: string;
	brand: string;
	is_final: boolean;
	saspicious: boolean;
	timestamp: number;
	camera_id: string;
	plate_number: string;
	schedule_id: string;
	confidence: number;
	owner: string;
	allowed: boolean;
	type: 'plate';
}

export interface PlateNumber {
	first: string;
	second: string;
	third: string;
	fourth: string;
	fifth: string;
}

export class Plate {
	plate: IPlate = {
		track_id: 0,
		candidate_ocr: '',
		saspicious_ocr: '',
		track_bbox: [0, 0, 1, 1],
		crop: '',
		speed: '',
		color: '',
		brand: '',
		owner: '',
		is_final: false,
		allowed: true,
		saspicious: false,
		timestamp: 0,
		camera_id: '',
		plate_number: '',
		schedule_id: '',
		confidence: 0,
		type: 'plate'
	};
	constructor(plateObj: {
		color: string;
		brand: string;
		camera_id: string;
		plate_number: PlateNumber;
		owner: string;
	}) {
		this.plate.color = plateObj.color;
		this.plate.brand = plateObj.brand;
		this.plate.allowed = true;
		this.plate.owner = plateObj.owner;
		this.plate.timestamp = new Date().getTime();
		this.plate.camera_id = plateObj.camera_id;
		this.plate.plate_number = stringifyPlate({ number_plate: plateObj.plate_number } as unknown as {
			[key: string]: string;
		});
		this.plate.type = 'plate';
	}
	toObject(): IPlate {
		return this.plate;
	}
}

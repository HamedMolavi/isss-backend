import { englishPlateDict } from "../../../tools/plate.tools";

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
        candidate_ocr: "",
        saspicious_ocr: "",
        track_bbox: [0, 0, 1, 1],
        crop: "",
        speed: "",
        color: "",
        brand: "",
        is_final: false,
        saspicious: false,
        timestamp: 0,
        camera_id: "",
        plate_number: "",
        schedule_id: "",
        confidence: 0
    }
    constructor(_color: string, _brand: string, _camera_id: string, plate_number: PlateNumber) {
        this.plate.color = _color;
        this.plate.brand = _brand;
        this.plate.timestamp = (new Date()).getTime();
        this.plate.camera_id = _camera_id;
        this.plate.plate_number = this.generatePlateNumber(plate_number);
    }
    toObject(): IPlate {
        return this.plate;
    }
    generatePlateNumber(plate_number: PlateNumber): string {
        return `${plate_number.first}${englishPlateDict[plate_number.second]}${plate_number.third}${plate_number.fifth}`;
    }
}
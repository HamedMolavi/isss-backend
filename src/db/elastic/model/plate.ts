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
    owner: string;
    allowed: boolean;
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
        owner: "",
        is_final: false,
        allowed: true,
        saspicious: false,
        timestamp: 0,
        camera_id: "",
        plate_number: "",
        schedule_id: "",
        confidence: 0
    }
    constructor(plateObj: {color: string, brand: string, camera_id: string, plate_number: string, owner: string}) {
        this.plate.color = plateObj.color;
        this.plate.brand = plateObj.brand;
        this.plate.allowed = true;
        this.plate.owner = plateObj.owner;
        this.plate.timestamp = (new Date()).getTime();
        this.plate.camera_id = plateObj.camera_id;
        this.plate.plate_number = plateObj.plate_number;
    }
    toObject(): IPlate {
        return this.plate;
    }

}
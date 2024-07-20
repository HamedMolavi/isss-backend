import { ICar } from "../types/interfaces/car.interface";
import { englishPlateDict, persianPlateDict } from "./plate.tools";
import { allowedPassRevert } from "./time.tools";

export function carSendFunction(doc: ICar) {
  return {
    owner: doc.owner,
    plate_type: doc.plate_type,
    number_plate: doc.number_plate,
    brand: doc.brand,
    color: doc.color,
    allowed_pass: !!doc.allowed_pass ? allowedPassRevert(doc) : undefined,
    camera_whitelist: doc.camera_whitelist,
    _id: doc._id,
  }
};

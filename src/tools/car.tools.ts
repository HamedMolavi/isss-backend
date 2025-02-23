import { ICar } from "../types/interfaces/car.interface";
import { englishPlateDict, persianPlateDict } from "./plate.tools";
import { allowedPassRevert } from "./time.tools";

export function carSendFunction(doc: ICar) {
  return {
    owner: doc.owner,
    number_plate: {
      first: Number(doc.number_plate.substr(0, 2)),
      second: persianPlateDict[doc.number_plate.substr(2, 1)],
      third: Number(doc.number_plate.substr(3, 3)),
      fourth: "ایران",
      fifth: Number(doc.number_plate.substr(6, 2)),
    },
    brand: doc.brand,
    color: doc.color,
    allowed_pass: !!doc.allowed_pass ? allowedPassRevert(doc) : undefined,
    camera_whitelist: doc.camera_whitelist,
    _id: doc._id,
  }
};
export function stringifyPlate(body: { "number_plate"?: { [key: string]: string } }) {
  if (!body?.number_plate) return undefined;
  return `${body.number_plate?.first}${englishPlateDict[body.number_plate?.second]}${body.number_plate?.third}${body.number_plate?.fifth}`
};

export function platesToStrings(plates: Array<{ first: string, second: string, third: string, fourth: 'ایران', fifth: string }>) {
  let results: string[]
  // if (!plates.every((plate) => Object.values(plate).reduce((pre, curr) => pre + (!!curr ? 1 : 0), 0)===5)) return []

  results = plates.map(plate => {
    return `${['', '?', '??', '؟', '؟؟'].includes(plate.first) ? '??' : plate.first.length === 1 ? plate.first + '?' : plate.first.slice(0, 2)
      }${englishPlateDict[plate.second] ?? "?"
      }${['', '?', '??', '???', '؟', '؟؟', '؟؟؟'].includes(plate.third) ? '???' : ([1, 2].includes(plate.third.length) ? plate.third + '??' : plate.third).slice(0, 3)
      }${['', '?', '??', '؟', '؟؟'].includes(plate.fifth) ? '??' : plate.fifth.length === 1 ? plate.fifth + '?' : plate.fifth.slice(0, 2)
      }`;
  })

  return results;
}

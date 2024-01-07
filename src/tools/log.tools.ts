import Camera from "../db/mongo/models/camera";
import Car from "../db/mongo/models/car";
import CarBrand from "../db/mongo/models/carBrand";
import CarColor from "../db/mongo/models/carColor";
import Personnel from "../db/mongo/models/personnel";
import Schedule from "../db/mongo/models/schedule";
import ModelToCamera from "../db/mongo/models/modelToCamera";
import Section from "../db/mongo/models/section";
import Department from "../db/mongo/models/department";
import { persianPlateDict, english2Persian } from "./plate.tools";
import Model from "../db/mongo/models/model";
import { ICar, ICarBrand, ICarColor } from "../types/interfaces/car.interface";
import { IPersonnel } from "../types/interfaces/personnel.interface";
import { ICamera } from "../types/interfaces/camera.interface";
import { read } from "../db/mongo/read.database";
import { Types } from "mongoose";
import { ISchedule } from "../types/interfaces/schedule.interface";
import { IModel } from "../types/interfaces/model.interface";
import { IModelToCamera } from "../types/interfaces/modelToCamera.interface";
import { ISection } from "../types/interfaces/section.interface";
import { IDepartment } from "../types/interfaces/department.interface";
import { eventDepartmentLogResult, eventLogResult, faceLogResult, fireLogResult, humanLogResult, plateLogResult, sabotageLogResult } from "../types/interfaces/log.interface";

//create json response sabotageLog report to send to client
export async function sabotageLogResponse(response: any, time_start: string, time_end: string, timezone: string): Promise<sabotageLogResult> {
  let results: sabotageLogResult = [];
  let cameras: (ICamera & { _id: Types.ObjectId; })[] = await read(Camera);
  for (let log of response.data.hits.hits) {
    let srcCamId = log._source.camera_id.toString();
    let result = {
      camera_id: log._source.camera_id.toString(),
      camera: cameras.find((cam) => cam._id.toString() === srcCamId)?.name ?? "",
      time: log._source?.timestamp ? new Date(log._source.timestamp).toLocaleString("en-US", { timeZone: timezone }) : "",
      video: cameras.find((cam) => cam._id.toString() === srcCamId)?.url ?? "",
    };
    results.push(result);
  };
  return results;
};
//create json response plateLog report for send to client
export async function plateLogResponse(
  response: any,
  carBrand: string[] | undefined,
  carColor: string[] | undefined,
  owner: string[] | undefined,
  allowed: boolean | undefined,
  search: boolean,
  timezone: string
): Promise<plateLogResult> {
  let cars: (ICar & { _id: Types.ObjectId; })[] =
    (!!owner && !!carColor && !!carBrand)
      ? await read(Car, { query: { $or: [{ owner: { $in: owner } }, { color_id: { $in: carColor } }, { brand_id: { $in: carBrand } }] } })
      : await read(Car);
  let cameras: (ICamera & { _id: Types.ObjectId; })[] = await read(Camera);
  let personnels: (IPersonnel & { _id: Types.ObjectId; })[] = await read(Personnel);
  let colors: (ICarColor & { _id: Types.ObjectId; })[] = await read(CarColor);
  let brands: (ICarBrand & { _id: Types.ObjectId; })[] = await read(CarBrand);

  //get cars with match plate_number from elastic search to cars plate_number
  let data: plateLogResult = [];
  //create json response
  for (let log of response.data.hits.hits) {
    const srcCamId = log._source.camera_id.toString();
    //split plate_number to get first and last digit
    //change plate number format from english to persian
    let plateNumber1 = Number(log._source.plate_number.substr(0, 2)).toLocaleString("fa-IR");
    let plateNumber2 = log._source.plate_number.substr(2, 1);
    let plateNumber3 = Number(log._source.plate_number.substr(3, 3)).toLocaleString("fa-IR");
    let plateNumber4 = Number(log._source.plate_number.substr(6, 2)).toLocaleString("fa-IR");
    //add plate number to json response for sort persian format in font end
    let plateNumber = {
      first: plateNumber1,
      second: persianPlateDict[plateNumber2],
      third: plateNumber3,
      fourth: "ایران",
      fifth: plateNumber4,
    };

    //define json for add in list response data
    let result = {
      camera_type: cameras.find((cam) => cam._id.toString() === srcCamId)?.camera_type ?? "",
      camera_id: log._source.camera_id.toString(),
      camera: cameras.find((cam) => cam._id.toString() === srcCamId)?.name ?? "",
      time: log._source?.timestamp ? new Date(log._source.timestamp).toLocaleString("en-US", { timeZone: timezone }) : "",
      plate_number: plateNumber,
      owner: "",
      color: "",
      brand: "",
      allowed: false,
      crop: log._source?.crop,
      video: cameras.find((cam) => cam._id.toString() === srcCamId)?.url ?? "",
    };
    //get compare plate_number from elastic search to cars plate_number and get owner, color, brand fore search api
    for (let car of cars) {
      if (log._source.plate_number === car.number_plate) {
        //get owner from DB and set to result
        let personnel = personnels.find((person) => person._id == car.owner);
        result.owner = personnel != null ? personnel?.first_name + " " + personnel?.last_name : "null";
        //get color from DB and set to result
        result.color = colors.find((col) => col._id.toString() === car.color.toString())?.name ?? "null";
        //get brand from DB and set to result
        result.brand = brands.find((bra) => bra._id.toString() === car.brand.toString())?.name ?? "null";
        result.allowed = car.camera_whitelist.includes(log._source.camera_id) ? true : false;
      };
    };
    data.push(result);
  };
  if (search && (allowed != null)) {
    data = data.filter((item: any) => item.allowed === allowed);
  };
  return data;
};
//create json response humanLog report for send to client
export async function humanLogResponse(response: any, allowed: boolean | undefined, search: boolean | null, timezone: string): Promise<humanLogResult> {
  //create json response
  let data: humanLogResult = [];
  let schedules: (ISchedule & { _id: Types.ObjectId; })[] = await read(Schedule);
  let cameras: (ICamera & { _id: Types.ObjectId; })[] = await read(Camera);
  for (let log of response.data.hits.hits) {
    let schedule = schedules.find((item) => item._id === log.schedule_id);
    let result = {
      camera_id: log._source.camera_id.toString(),
      camera_type: cameras.find((cam) => cam._id.toString() === log._source.camera_id.toString())?.camera_type ?? "",
      camera: cameras.find((cam) => cam._id.toString() === log._source.camera_id.toString())?.name ?? "",
      time: log._source?.timestamp ? new Date(log._source.timestamp).toLocaleString("en-US", { timeZone: timezone }) : "",
      numberOfPeople: log._source.number_of_people,
      allowed: (schedule && schedule.config.max_people >= log._source.number_of_people && schedule!.config!.min_people <= log._source.number_of_people) ?? false,
      video: cameras.find((cam) => cam._id.toString() == log._source.camera_id.toString())?.url ?? "",
    };
    data.push(result);
  };
  if (search && (allowed != null)) {
    data = data.filter((item: any) => item.allowed === allowed);
  };
  return data;
};
//create json response fireLog report for send to client
export async function fireLogResponse(response: any, timezone: string): Promise<fireLogResult> {
  //create json response
  let data: fireLogResult = [];
  let cameras: (ICamera & { _id: Types.ObjectId; })[] = await read(Camera);
  for (let log of response.data.hits.hits) {
    let result = {
      camera_id: log._source.camera_id.toString(),
      camera: cameras.find((cam) => cam._id.toString() == log._source.camera_id.toString())?.name ?? "",
      time: log._source?.timestamp ? new Date(log._source.timestamp).toLocaleString("en-US", { timeZone: timezone }) : "",
      probability: log._source.confidence,
      video: cameras.find((cam) => cam._id.toString() === log._source.camera_id.toString())?.url ?? "",
    };
    data.push(result);
  };
  return data;
};
//create json response faceLog report for send to client
export async function faceLogResponse(response: any, allowed: boolean | undefined, search: boolean | null, timezone: string): Promise<faceLogResult> {
  //create json response
  let data: faceLogResult = [];
  let cameras: (ICamera & { _id: Types.ObjectId; })[] = await read(Camera);
  let personnels: (IPersonnel & { _id: Types.ObjectId; })[] = await read(Personnel);
  for (let log of response.data.hits.hits) {
    let personnel = personnels.find((person) => log._source.personnel_id === person._id);
    let result = {
      camera_type: cameras.find((cam) => cam._id.toString() === log._source.camera_id.toString())?.camera_type ?? "",
      camera_id: log._source.camera_id.toString(),
      camera: cameras.find((cam) => cam._id.toString() === log._source.camera_id.toString())?.name ?? "",
      fullName: personnel != null ? personnel?.first_name + " " + personnel?.last_name : "",
      time: log._source?.timestamp ? new Date(log._source.timestamp).toLocaleString("en-US", { timeZone: timezone }) : "",
      allowed: personnel?.camera_whitelist.includes(log._source.camera_id) ?? false,
      video: cameras.find((cam) => cam._id.toString() === log._source.camera_id.toString())?.url ?? "",
      face_crop: log?._source?.face_crop,
      confidence: log?._source?.confidence,
    };
    data.push(result);
  };
  if (search && (allowed != null)) data = data.filter((item: any) => item.allowed === allowed);
  return data;
};

//create json response eventLog report for send to client
export async function eventLogResponse(response: any, timezone: string): Promise<eventLogResult> {
  //create json response
  let data: eventLogResult = [];
  let cameras: (ICamera & { _id: Types.ObjectId; })[] = await read(Camera);
  let schedules: (ISchedule & { _id: Types.ObjectId; })[] = await read(Schedule);
  let models: (IModel & { _id: Types.ObjectId; })[] = await read(Model);
  let modelToCameras: (IModelToCamera & { _id: Types.ObjectId; })[] = await read(ModelToCamera);
  let sections: (ISection & { _id: Types.ObjectId; })[] = await read(Section);
  let departments: (IDepartment & { _id: Types.ObjectId; })[] = await read(Department);
  let personnels: (IPersonnel & { _id: Types.ObjectId; })[] = await read(Personnel);
  let cars: (ICar & { _id: Types.ObjectId; owner: IPersonnel })[] = await read(Car, { populate: "owner" });
  for (let log of response.data.hits.hits) {
    let schedule = schedules.find((sche) => log._source.log.schedule_id.toString() === sche._id.toString());
    let modelToCamera = modelToCameras.find((mod2cam) => schedule?.model_camera_id.toString() === mod2cam._id.toString());
    let model = models.find((mod) => modelToCamera?.model_id.toString() === mod._id.toString());
    let personnel = personnels.find((per: any) => per?._id?.toString() === log._source.log.personnel_id);
    let owner: any;
    let number_plate: string = "";
    if (log?._source?.log?.plate_number) {
      owner = cars.find((car: any) => car?.plate_number?.toString() === log?._source?.log?.plate_number);
      number_plate = english2Persian(log?._source?.log?.plate_number);
    };
    let result = {
      camera_type: cameras.find((cam) => cam._id.toString() === log._source?.log.camera_id.toString())?.camera_type ?? "",
      title: personnel != null ? "Alerting" : "Warnings",
      type: log._source.type as string,
      cause: log._source.cause as string,
      camera_id: log._source.log.camera_id as string,
      personnel: personnel != null ? personnel?.first_name + " " + personnel?.last_name : "",
      personnel_code: personnel?.personnel_code ?? "" as string,
      peopleCounting: log?._source?.log?.number_of_people ?? "" as string,
      plate_number: number_plate ?? "",
      owner: owner != null ? owner?.owner?.first_name + " " + owner?.owner?.last_name : "",
      name: cameras.find((cam) => cam._id.toString() === log._source.log.camera_id?.toString())?.name ?? "",
      time: log._source.log?.timestamp ? new Date(log._source.log.timestamp).toLocaleString("en-US", { timeZone: timezone }) : "",
      ai: model != undefined ? model.category : "",
      section: sections.find((sec) => {
        let camera = cameras.find((cam) => cam._id.toString() === log._source.log.camera_id?.toString());
        return (camera?.section_id.toString() === sec._id.toString())
      })?.name ?? "",
      department: departments.find((dep) => {
        let camera = cameras.find((cam) => cam._id.toString() === log._source.log.camera_id?.toString());
        let section = sections.find((sec) => sec._id.toString() === camera?.section_id?.toString());
        return section?.department_id.toString() === dep._id.toString()
      })?.name ?? "",
      description: "",
      video: cameras.find((cam) => cam._id.toString() === log._source.log.camera_id?.toString())?.url ?? "",
    };
    // result.description = extended_description({
    //   description: log._source.description,
    //   camera: result.name,
    //   section: result.section,
    //   departement: result.department,
    //   log: log,
    //   perssonels: personnels,
    //   cars: cars,
    // });
    data.push(result);
  }
  return data;
};
// //define function fore extended description on dend toclient with event report
// function extended_description(_description: Description) {
//   let notification_text: string = "";
//   if (_description.log._source.type === "face") {
//     let personnel = _description.perssonels.find((per: any) => {
//       if (per?._id?.toString() === _description.log._source.log.personnel_id) {
//         return per;
//       }
//     });
//     notification_text = personnel
//       ? `${personnel?.first_name} ${personnel?.last_name} with personnel code: ${personnel.personnel_code} detected\ndescription:${_description.description}`
//       : `none person ditected, description:${_description.description}`;
//   } else if (_description.log._source.type === "fire") {
//     notification_text = `${_description.description}`;
//   } else if (_description.log._source.type === "human") {
//     notification_text = `#${_description.log._source.log.number_of_people} human(s) ditected,
//      description:${_description.description}`;
//   } else if (_description.log._source.type === "sabotage") {
//     notification_text = `sabotage ditected,
//      description:${_description.description}`;
//   } else if (_description.log._source.type === "plate") {
//     let owner: any = _description.cars.find((_car: any) => {
//       if (_car?.plate_number === _description.log._source.log.plate_number) {
//         return _description.perssonels.find((per: any) => {
//           if (per?._id?.toString() === _car.owner.toString()) {
//             return per;
//           }
//         });
//       }
//     });
//     notification_text = `number plate: ${_description.log._source.log.plate_number}  with owner:${owner?.first_name} ${owner?.last_name} detected description:${_description.description}`;
//   }
//   return notification_text;
// }

//create json response eventLog report for send to client
export async function eventDepartmentLogResponse(response: any): Promise<eventDepartmentLogResult> {
  //create json response
  let data: eventDepartmentLogResult = [];
  let cameraIds: string[] = [];
  for (let i = 0; i < response.data.hits.hits[0]._source.alerts.length; i++) {
    //get camera from mongo db by id for get camera name
    if (cameraIds.includes(response.data.hits.hits[0]._source.alerts[i].labels.camera_id)) continue
    else {
      cameraIds.push(response.data.hits.hits[0]._source.alerts[i].labels.camera_id);
      let camera = (await read(Camera, { query: { _id: response.data.hits.hits[0]._source.alerts[i].labels.camera_id } }))[0];
      let sections = await read(Section, { query: { section_id: camera?.section_id } });
      let department = (await read(Department, { query: { _id: sections[0]?.department_id } }))[0];
      let result = {
        department: department?.name,
        sections: sections,
        time: new Date(response.data.hits.hits[0]._source.alerts[i].labels.timestamp),
        AI: response.data.hits.hits[0]._source.alerts[i].labels.module,
        description: response.data.hits.hits[0]._source.alerts[i].annotations.description,
      };
      data.push(result);
    };
  };
  return data;
};
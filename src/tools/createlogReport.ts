import Camera, { ICamera } from "../models/camera";
import Car from "../models/car";
import CarBrand from "../models/carBrand";
import CarColor from "../models/carColor";
import Personnel, { IPersonnel } from "../models/personnel";
import Schedule from "../models/schedule";
import ModelToCamera from "../models/modelToCamera";
import Section from "../models/section";
import Department from "../models/department";
import toPersianPlate from "./EnglishToPersianPlate";
import Model, { IModel } from "../models/model";
import fs from "fs";
import { getPathFromIdTime } from "./getPathFromIdTiem";

//create json response sabotageLog report for send to client
export async function sabotageLogResponse(response: any, time_start: string, time_end: string) {
  //create json response
  let _data: object[] = [];
  let cameras = await Camera.find().exec();
  for (let log of response.data.hits.hits) {
    let result = {
      camera_id: log._source.camera_id,
      camera:
        cameras.find((cam) => {
          if (cam._id == log._source.camera_id) return cam.name;
        })?.name ?? "",
      time: log._source?.timestamp ? new Date(log._source.timestamp).toLocaleString() : "",
    };
    _data.push(result);
  }
  return _data;
}
//create json response plateLog report for send to client
export async function plateLogResponse(
  response: any,
  carBrand: string[] | null,
  carColor: string[] | null,
  owner: string[] | null,
  allowed: boolean | null,
  search: boolean,
  time_start: string,
  time_end: string
) {
  let cars: any;
  if (owner && carColor && carBrand) {
    cars = await Car.find({
      $or: [{ owner: { $in: owner } }, { color_id: { $in: carColor } }, { brand_id: { $in: carBrand } }],
    }).exec();
  } else {
    //send error if owner or color or brand is not found in DB
    cars = await Car.find({}).exec();
  }
  let cameras = await Camera.find().exec();
  let personnels = await Personnel.find().exec();
  let colors = await CarColor.find().exec();
  let brands = await CarBrand.find().exec();

  //get cars with match plate_number from elastic search to cars plate_number
  let _data: object[] = [];
  //create json response
  for (let log of response.data.hits.hits) {
    //split plate_number to get first and last digit
    //change plate number format from english to persian
    let plateNumber1 = Number(log._source.plate_number.substr(0, 2)).toLocaleString("fa-IR");
    let plateNumber2 = log._source.plate_number.substr(2, 1);
    let plateNumber3 = Number(log._source.plate_number.substr(3, 3)).toLocaleString("fa-IR");
    let plateNumber4 = Number(log._source.plate_number.substr(6, 2)).toLocaleString("fa-IR");
    //add plate number to json response for sort persian format in font end
    let plateNumber = {
      first: plateNumber1,
      second: toPersianPlate[plateNumber2],
      third: plateNumber3,
      fourth: "ایران",
      fifth: plateNumber4,
    };

    //define json for add in list response data
    let result = {
      camera_id: log._source.camera_id,
      camera:
        cameras.find((cam) => {
          if (cam._id == log._source.camera_id) return cam.name;
        })?.name ?? "",
      time: log._source?.timestamp ? new Date(log._source.timestamp).toLocaleString() : "",
      plate_number: plateNumber,
      owner: "",
      color: "",
      brand: "",
      allowed: false,
    };
    //get compare plate_number from elastic search to cars plate_number and get owner, color, brand fore search api
    for (let car of cars) {
      if (log._source.plate_number === car.number_plate) {
        //get owner from DB and set to result
        let _personnel = personnels.find((person) => {
          if (person._id == car.owner) return person;
        });
        result.owner = _personnel != null ? _personnel?.first_name + " " + _personnel?.last_name : "null";
        //get color from DB and set to result
        (result.color =
          colors.find((col) => {
            if (col._id == car.color) return col.name;
          })?.name ?? "null"),
          //get brand from DB and set to result
          (result.brand =
            brands.find((bra) => {
              if (bra._id == car.brand) return bra.name;
            })?.name ?? "null"),
          (result.allowed = car.camera_whitelist.includes(log._source.camera_id) ? true : false);
      }
    }
    //if car not found in DB and request for all log report then add plate without owner
    if (search && result.allowed == allowed) {
      _data.push(result);
    } else if (search == false) {
      _data.push(result);
    }
  }
  return _data;
}
//create json response humanLog report for send to client
export async function humanLogResponse(response: any, allowed: boolean | null, search: boolean | null, time_start: string, time_end: string) {
  //create json response
  let _data: object[] = [];
  //let modelToCameras = await ModelToCamera.find().exec();
  let schedules = await Schedule.find().exec();
  let cameras = await Camera.find().exec();
  for (let log of response.data.hits.hits) {
    let _schedule = schedules.find((item) => {
      if (item._id == log.schedule_id) return item;
    });
    let result = {
      camera_id: log._source.camera_id,
      camera:
        cameras.find((cam) => {
          if (cam._id == log._source.camera_id) return cam.name;
        })?.name ?? "",
      time: log._source?.timestamp ? new Date(log._source.timestamp).toLocaleString() : "",
      numberOfPeople: log._source.number_of_people,
      allowed: (_schedule && _schedule.config.max_people >= log._source.number_of_people && _schedule!.config!.min_people <= log._source.number_of_people) ?? false,
    };
    if (search && result.allowed == allowed) {
      _data.push(result);
    } else if (search == false) {
      _data.push(result);
    }
  }
  return _data;
}
//create json response fireLog report for send to client
export async function fireLogResponse(response: any, time_start: string, time_end: string) {
  //create json response
  let _data: object[] = [];
  let cameras = await Camera.find().exec();
  for (let log of response.data.hits.hits) {
    let result = {
      camera_id: log._source.camera_id,
      camera:
        cameras.find((cam) => {
          if (cam._id == log._source.camera_id) return cam.name;
        })?.name ?? "",
      time: log._source?.timestamp ? new Date(log._source.timestamp).toLocaleString() : "",
      probability: log._source.confidence,
    };
    _data.push(result);
  }
  return _data;
}
//create json response faceLog report for send to client
export async function faceLogResponse(response: any, allowed: boolean | null, search: boolean | null, time_start: string, time_end: string) {
  //create json response
  let _data: object[] = [];
  let cameras = await Camera.find().exec();
  let personnels = await Personnel.find().exec();
  for (let log of response.data.hits.hits) {
    let _personnel = personnels.find((person) => {
      if (log._source.personnel_id == person._id) {
        return person.first_name + " " + person.last_name;
      }
    });

    let result = {
      camera_id: log._source.camera_id,
      camera:
        cameras.find((cam) => {
          if (cam._id == log._source.camera_id) return cam.name;
        })?.name ?? "",
      fullName: _personnel != null ? _personnel?.first_name + " " + _personnel?.last_name : "",
      time: log._source?.timestamp ?new Date(log._source.timestamp).toLocaleString() : "",
      allowed: _personnel?.camera_whitelist.includes(log._source.camera_id) ?? false,
    };
    if (search && result.allowed == allowed) {
      _data.push(result);
    } else if (search == false) {
      _data.push(result);
    }
  }
  return _data;
}

//create json response eventLog report for send to client
export async function eventLogResponse(response: any, time_start: string, time_end: string) {
  const dbUri = process.env["BASE_URL"] as string;
  //create json response
  let _data: object[] = [];
  let cameras = await Camera.find().exec();
  let schedules = await Schedule.find().exec();
  let models = await Model.find().exec();
  let modelToCameras = await ModelToCamera.find().exec();
  let sections = await Section.find().exec();
  let departments = await Department.find().exec();
  for (let log of response.data.hits.hits) {
    const videoPath = getPathFromIdTime(log._source.log.timestamp, log._source.log.camera_id.toString());
    let existVideo: boolean = false;
    if (videoPath !== "" && fs.existsSync(videoPath)) {
      existVideo = true;
    }
    let schedule = schedules.find((sche) => {
      if (log._source.log.schedule_id.toString() == sche._id.toString()) return sche;
    });
    let modelToCamera = modelToCameras.find((mod2cam) => {
      if (schedule?.model_camera_id.toString() == mod2cam._id.toString()) {
        return mod2cam;
      }
    });
    let _model = models.find((mod) => {
      if (modelToCamera?.model_id.toString() == mod._id.toString()) return mod;
    });
    let result = {
      type: log._source.type,
      cause: log._source.cause,
      camera_id: log._source.log.camera_id,
      name:
        cameras.find((cam) => {
          if (cam._id.toString() == log._source.log.camera_id.toString()) return cam;
        })?.name ?? "",
      time: log._source.log?.timestamp ? new Date(log._source.log.timestamp).toLocaleString() : "",
      ai: _model != undefined ? _model.category : "",
      section:
        sections.find((sec) => {
          let camera = cameras.find((cam) => {
            if (cam._id.toString() == log._source.log.camera_id.toString()) return cam;
          });
          if (camera?.section_id.toString() == sec._id.toString()) {
            return sec;
          }
        })?.name ?? "",
      department:
        departments.find((dep) => {
          let _camera = cameras.find((cam) => {
            if (cam._id.toString() == log._source.log.camera_id.toString()) return cam;
          });
          let _section = sections.find((sec) => {
            if (sec._id.toString() == _camera?.section_id.toString()) return sec;
          });
          if (_section?.department_id.toString() == dep._id.toString()) {
            return dep;
          }
        })?.name ?? "",
      description: log._source.description,
      video: existVideo ? "http://" + dbUri + "/downloadVideo/" + log._source.log.camera_id + "." + log._source.log.timestamp : "",
    };
    _data.push(result);
  }
  return _data;
}

//create json response eventLog report for send to client
export async function eventDepartmentLogResponse(response: any) {
  //create json response
  let _data: object[] = [];
  let cameraIds: string[] = [];
  for (let i = 0; i < response.data.hits.hits[0]._source.alerts.length; i++) {
    //get camera from mongo db by id for get camera name
    if (cameraIds.includes(response.data.hits.hits[0]._source.alerts[i].labels.camera_id)) {
      continue;
    } else {
      cameraIds.push(response.data.hits.hits[0]._source.alerts[i].labels.camera_id);
      let camera = await Camera.findById(response.data.hits.hits[0]._source.alerts[i].labels.camera_id).exec();

      //let cameras = await Camera.find({ section_id: camera?.section_id }).exec();

      let sections = await Section.find({
        section_id: camera?.section_id,
      }).exec();

      let department = await Department.findById(sections[0]?.department_id).exec();

      let result = {
        department: department?.name,
        sections: sections,
        time: new Date(response.data.hits.hits[0]._source.alerts[i].labels.timestamp),
        AI: response.data.hits.hits[0]._source.alerts[i].labels.module,
        description: response.data.hits.hits[0]._source.alerts[i].annotations.description,
      };
      _data.push(await result);
    }
  }
  return _data;
}

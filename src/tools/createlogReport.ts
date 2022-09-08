import Camera from "../models/camera";
import Car from "../models/car";
import CarBrand from "../models/carBrand";
import CarColor from "../models/carColor";
import Personnel, { IPersonnel } from "../models/personnel";
import Schedule from "../models/schedule";
import ModelToCamera from "../models/modelToCamera";
import Section from "../models/section";
import Department from "../models/department";
import toPersianPlate from "./EnglishToPersianPlate";
import Model from "../models/model";

//create json response sabotageLog report for send to client
export async function sabotageLogResponse(response: any) {
  //create json response
  let _data: object[] = [];
  for (let i = 0; i < response.data.hits.hits.length; i++) {
    //get camera from mongo db by id for get camera name
    let camera = await Camera.findById(response.data.hits.hits[i]._source.camera_id).exec();
    let result = {
      camera_id: response.data.hits.hits[i]._source.camera_id,
      camera: camera?.name,
      time: new Date(response.data.hits.hits[i]._source.timestamp),
    };
    _data.push(await result);
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
  search: string | null
) {
  //query for get cars from mongo db with list color and list brand and list owner
  let cars: any;
  if (owner && carColor && carBrand) {
    cars = await Car.find({
      $or: [{ owner: { $in: owner } }, { color_id: { $in: carColor } }, { brand_id: { $in: carBrand } }],
    }).exec();
  } else {
    //send error if owner or color or brand is not found in DB
    cars = await Car.find({}).exec();
  }
  //get cars with match plate_number from elastic search to cars plate_number
  let _data: object[] = [];
  //create json response
  for (let i = 0; i < response.data.hits.hits.length; i++) {
    //split plate_number to get first and last digit
    //change plate number format from english to persian
    let plateNumber1 = Number(response.data.hits.hits[i]._source.plate_number.substr(0, 2)).toLocaleString("fa-IR");
    let plateNumber2 = response.data.hits.hits[i]._source.plate_number.substr(2, 1);
    let plateNumber3 = Number(response.data.hits.hits[i]._source.plate_number.substr(3, 3)).toLocaleString("fa-IR");
    let plateNumber4 = Number(response.data.hits.hits[i]._source.plate_number.substr(6, 2)).toLocaleString("fa-IR");
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
      camera_id: response.data.hits.hits[i]._source.camera_id,
      camera:
        (await Camera.findById(response.data.hits.hits[i]._source.camera_id).then((camera) => {
          return camera?.name;
        })) ?? "null",
      time: new Date(response.data.hits.hits[i]._source.timestamp),
      plate_number: plateNumber,
      owner: "",
      color: "",
      brand: "",
      allowed: false,
    };
    //get compare plate_number from elastic search to cars plate_number and get owner, color, brand fore search api
    for (let j = 0; j < cars.length; j++) {
      if (response.data.hits.hits[i]._source.plate_number === cars[j].number_plate) {
        //get owner from DB and set to result
        result.owner =
          (await Personnel.findById(cars[j].owner)
            .exec()
            .then((personnel) => {
              return personnel?.first_name + " " + personnel?.last_name;
            })) ?? "null";
        //get color from DB and set to result
        result.color =
          (await CarColor.findById(cars[j].color_id)
            .exec()
            .then((carColor) => {
              return carColor?.name;
            })) ?? "null";
        //get brand from DB and set to result
        result.brand =
          (await CarBrand.findById(cars[j].brand_id)
            .exec()
            .then((car) => {
              return car?.name;
            })) ?? "null";

        //set allowed to result if car is allowed or not
        if (allowed === null) {
          result.allowed = cars[j].camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id) ? true : false;
        } else if (cars[j].camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id) !== allowed) {
          break;
        } else if (cars[j].camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id) === allowed) {
          result.allowed = allowed as boolean;
        }

        _data.push(result);
        break;
      }
    }
    //if car not found in DB and request for all log report then add plate without owner
    if (!search) {
      _data.push(result);
    }
  }
  return _data;
}
//create json response humanLog report for send to client
export async function humanLogResponse(response: any, allowed: boolean | null) {
  //create json response
  let _data: object[] = [];
  for (let i = 0; i < response.data.hits.hits.length; i++) {
    //get modelToCamera from mongo db by id
    let model2camera = await ModelToCamera.findOne({
      camera_id: response.data.hits.hits[i]._source.camera_id,
    }).exec();
    //get schedule from mongo db by model_camera_id for compare with max_people
    let schedule = await Schedule.findOne({
      model_camera_id: model2camera?._id.toString(),
    }).exec();
    //get camera from mongo db by id for get camera name
    let camera = await Camera.findById(response.data.hits.hits[i]._source.camera_id).exec();
    let result = {
      camera_id: response.data.hits.hits[i]._source.camera_id,
      camera: camera?.name,
      time: new Date(response.data.hits.hits[i]._source.timestamp),
      numberOfPeople: response.data.hits.hits[i]._source.number_of_people,
      allowed: false,
    };
    if (
      allowed === null
      // schedule!?.config!?.max_people! >=
      //   response.data.hits.hits[i].number_of_people ==
      //   allowed
    ) {
      result.allowed = schedule?.config?.max_people! >= response.data.hits.hits[i].number_of_people ? true : false;
    } else if (schedule?.config?.max_people! >= response.data.hits.hits[i].number_of_people === allowed) {
      result.allowed = allowed as boolean;
    } else if (schedule?.config?.max_people! >= response.data.hits.hits[i].number_of_people === allowed) {
      break;
    }
    _data.push(await result);
  }
  return _data;
}
//create json response fireLog report for send to client
export async function fireLogResponse(response: any) {
  //create json response
  let _data: object[] = [];
  for (let i = 0; i < response.data.hits.hits.length; i++) {
    //get camera from mongo db by id for get camera name
    let camera = await Camera.findById(response.data.hits.hits[i]._source.camera_id).exec();
    let result = {
      camera_id: response.data.hits.hits[i]._source.camera_id,
      camera: camera?.name,
      time: new Date(response.data.hits.hits[i]._source.timestamp),
      probability: response.data.hits.hits[i]._source.confidence,
    };
    _data.push(await result);
  }
  return _data;
}
//create json response faceLog report for send to client
export async function faceLogResponse(response: any, allowed: boolean | null) {
  //create json response
  let _data: object[] = [];
  for (let i = 0; i < response.data.hits.hits.length; i++) {
    //get personnel from mongo db by id
    let _personnel: IPersonnel | null;

    if (response.data.hits.hits[i]._source.personnel_id !== "-1") {
      _personnel = await Personnel.findById(response.data.hits.hits[i]._source.personnel_id).exec();
    } else {
      _personnel = null;
    }
    //get camera from mongo db by id for get camera name
    let camera = await Camera.findById(response.data.hits.hits[i]._source.camera_id).exec();
    let result = {
      camera_id: response.data.hits.hits[i]._source.camera_id,
      camera: camera?.name,
      time: new Date(response.data.hits.hits[i]._source.timestamp),
      fullName: _personnel ? _personnel?.first_name + " " + _personnel?.last_name : "",
      allowed: false,
      // allowed: _personnel?.camera_whitelist.includes(
      //   response.data.hits.hits[i]._source.camera_id
      // )
      //   ? true
      //   : false,
    };
    if (allowed === null) {
      result.allowed = _personnel?.camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id) ? true : false;
    } else if (_personnel?.camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id) === allowed) {
      result.allowed = allowed as boolean;
    } else if (_personnel?.camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id) === allowed) {
      break;
    }
    _data.push(await result);
  }
  return _data;
}

//create json response eventLog report for send to client
export async function eventLogResponse(response: any) {
  //create json response
  let _data: object[] = [];
  let cameraIds: string[] = [];
  for (let i = 0; i < response.data.hits.hits.length; i++) {
    cameraIds.push(response.data.hits.hits[i]._source.log.camera_id);
    let camera = await Camera.findById(response.data.hits.hits[i]._source.log.camera_id).exec();
    let schedule = await Schedule.findById(response.data.hits.hits[i]._source.log.schedule_id).exec();
    let model ;
    if (schedule) {
     let modelToCamera = await ModelToCamera.findById(schedule.model_camera_id).exec();
     if(modelToCamera){
      model = await Model.findById(modelToCamera.model_id).exec();
     }
    }
    let result = {
      camera_id: response.data.hits.hits[i]._source.log.camera_id,
      name: camera != null ? camera.name : "",
      time: new Date(response.data.hits.hits[i]._source.log.timestamp),
      ai: model != null ? model.category : "",
      description: response.data.hits.hits[i]._source.description,
    };
    _data.push(await result);
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

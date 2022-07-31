import Camera from "../models/camera";
import Car from "../models/car";
import CarBrand from "../models/carBrand";
import CarColor from "../models/carColor";
import Personnel, { IPersonnel } from "../models/personnel";
import Schedule from "../models/schedule";
import ModelToCamera from "../models/modelToCamera";
import Section from "../models/section";
import Departement from "../models/departement";
import toPersianPlate from "./EnglishToPersianPlate";

//create json response sabotageLog report for send to client
export async function sabotageLogResponse(response: any) {
  //ceate json response
  let _data: object[] = [];
  for (let i = 0; i < response.data.hits.hits.length; i++) {
    //get camera from mongo db by id for get camera name
    let camera = await Camera.findById(
      response.data.hits.hits[i]._source.camera_id
    ).exec();
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
  allowed: boolean | undefined,
  search: string | null
) {
  //query for get cars from mongo db with list color and list brand and list owner
  let cars: any;
  if (owner && carColor && carBrand) {
    cars = await Car.find({
      $and: [
        { owner: { $in: owner } },
        { color_id: { $in: carColor } },
        { brand_id: { $in: carBrand } },
      ],
    }).exec();
  } else {
    //send error if owner or color or brand is not found in DB
    console.log("owner, carColor, carBrand is null");
    cars = await Car.find({}).exec();
  }
  //get casr with match plate_number from elastic search to cars plate_number
  let _data: object[] = [];
  //create json response
  for (let i = 0; i < response.data.hits.hits.length; i++) {
    let result = {
      camera_id: response.data.hits.hits[i]._source.camera_id,
      camera: response.data.hits.hits[i]._source.camera,
      time: new Date(response.data.hits.hits[i]._source.timestamp),
      plate_number: response.data.hits.hits[i]._source.plate_number,
      owner: "",
      color: "",
      brand: "",
    };
    //get compare plate_number from elastic search to cars plate_number and get owner, color, brand fore search api
    for (let j = 0; j < cars.length; j++) {
      if (
        response.data.hits.hits[i]._source.plate_number === cars[j].number_plate
      ) {
        //let plateNumber = response.data.hits.hits[i]._source.plate_number.split();
        //plateNumber[2] = toPersianPlate[plateNumber[2]];
        // plateNumber = plateNumber[0] + plateNumber[1] + plateNumber[2] + plateNumber[3] + " ایران "+ plateNumber[4] + plateNumber[5];
        //  let persianPlateNumber = plateNumber.replace("/[a-zA-Z]+/g",toPersianPlate.get(key));
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
export async function humanLogResponse(
  response: any,
  allowed: boolean | undefined
) {
  //ceate json response
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
    let camera = await Camera.findById(
      response.data.hits.hits[i]._source.camera_id
    ).exec();
    let result: any;
    if (
      allowed !== undefined &&
      schedule!?.config!?.max_people! >=
        response.data.hits.hits[i].number_of_people ==
        allowed
    ) {
      result = {
        camera_id: response.data.hits.hits[i]._source.camera_id,
        camera: camera?.name,
        time: new Date(response.data.hits.hits[i]._source.timestamp),
        numberOfPeople: response.data.hits.hits[i]._source.number_of_people,
        NumberOfPeople:
          schedule!?.config!?.max_people! >=
          response.data.hits.hits[i].number_of_people
            ? true
            : false,
      };
    } else if (allowed === undefined) {
      result = {
        camera_id: response.data.hits.hits[i]._source.camera_id,
        camera: camera?.name,
        time: new Date(response.data.hits.hits[i]._source.timestamp),
        numberOfPeople: response.data.hits.hits[i]._source.number_of_people,
        NumberOfPeople:
          schedule!?.config!?.max_people! >=
          response.data.hits.hits[i].number_of_people
            ? true
            : false,
      };
    }
    _data.push(await result);
  }
  return _data;
}
//create json response fireLog report for send to client
export async function fireLogResponse(response: any) {
  //ceate json response
  let _data: object[] = [];
  for (let i = 0; i < response.data.hits.hits.length; i++) {
    //get camera from mongo db by id for get camera name
    let camera = await Camera.findById(
      response.data.hits.hits[i]._source.camera_id
    ).exec();
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
export async function faceLogResponse(response: any) {
  //ceate json response
  let _data: object[] = [];
  for (let i = 0; i < response.data.hits.hits.length; i++) {
    //get personnel from mongo db by id
    let _personnel: IPersonnel | null;
    if (response.data.hits.hits[i]._source.personnel_id !== "-1") {
      _personnel = await Personnel.findById(
        response.data.hits.hits[i]._source.personnel_id
      ).exec();
    } else {
      _personnel = null;
    }
    //get camera from mongo db by id for get camera name
    let camera = await Camera.findById(
      response.data.hits.hits[i]._source.camera_id
    ).exec();
    let result = {
      camera_id: response.data.hits.hits[i]._source.camera_id,
      camera: camera?.name,
      time: new Date(response.data.hits.hits[i]._source.timestamp),
      fullName: _personnel?.first_name + " " + _personnel?.last_name,
      Allowed: _personnel?.camera_whitelist.includes(
        response.data.hits.hits[i]._source.camera_id
      )
        ? true
        : false,
    };
    _data.push(await result);
  }
  return _data;
}

//create json response eventLog report for send to client
export async function eventLogResponse(response: any) {
  //ceate json response
  let _data: object[] = [];
  let cameraIds: string[] = [];
  for (let i = 0; i < response.data.hits.hits[0]._source.alerts.length; i++) {
    //get camera from mongo db by id for get camera name
    if (
      cameraIds.includes(
        response.data.hits.hits[0]._source.alerts[i].labels.camera_id
      )
    ) {
      continue;
    } else {
      cameraIds.push(
        response.data.hits.hits[0]._source.alerts[i].labels.camera_id
      );
      let camera = await Camera.findById(
        response.data.hits.hits[0]._source.alerts[i].labels.camera_id
      ).exec();
      let result = {
        camera_id:
          response.data.hits.hits[0]._source.alerts[i].labels.camera_id,
        camera: camera?.name,
        time: new Date(
          response.data.hits.hits[0]._source.alerts[i].labels.timestamp
        ),
        AI: response.data.hits.hits[0]._source.alerts[i].labels.module,
        description:
          response.data.hits.hits[0]._source.alerts[i].annotations.description,
      };
      _data.push(await result);
    }
  }
  return _data;
}

//create json response eventLog report for send to client
export async function eventDepartmentLogResponse(response: any) {
  //ceate json response
  let _data: object[] = [];
  let cameraIds: string[] = [];
  for (let i = 0; i < response.data.hits.hits[0]._source.alerts.length; i++) {
    //get camera from mongo db by id for get camera name
    if (
      cameraIds.includes(
        response.data.hits.hits[0]._source.alerts[i].labels.camera_id
      )
    ) {
      continue;
    } else {
      cameraIds.push(
        response.data.hits.hits[0]._source.alerts[i].labels.camera_id
      );
      let camera = await Camera.findById(
        response.data.hits.hits[0]._source.alerts[i].labels.camera_id
      ).exec();

      //let cameras = await Camera.find({ section_id: camera?.section_id }).exec();

      let sections = await Section.find({
        section_id: camera?.section_id,
      }).exec();

      let department = await Departement.findById(
        sections[0]?.departement_id
      ).exec();

      let result = {
        department: department?.name,
        sections: sections,
        time: new Date(
          response.data.hits.hits[0]._source.alerts[i].labels.timestamp
        ),
        AI: response.data.hits.hits[0]._source.alerts[i].labels.module,
        description:
          response.data.hits.hits[0]._source.alerts[i].annotations.description,
      };
      _data.push(await result);
    }
  }
  return _data;
}

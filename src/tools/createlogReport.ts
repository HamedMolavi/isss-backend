import Camera from "../models/camera";
import Car from "../models/car";
import CarBrand from "../models/carBrand";
import CarColor from "../models/carColor";
import Personnel, { IPersonnel } from "../models/personnel";
import Schedule from "../models/schedule";
import ModelToCamera from "../models/modelToCamera";
import Section from "../models/section";
import Departement from "../models/departement";

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
      time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
    };
    _data.push(await result);
  }
  return _data;
}
//create json response plateLog report for send to client
export async function plateLogResponse(response: any) {
  //ceate json response
  let _data: object[] = [];
  for (let i = 0; i < response.data.hits.hits.length; i++) {
    //get camera from mongo db by id for get camera name
    let camera = await Camera.findById(
      response.data.hits.hits[i]._source.camera_id
    ).exec();
    //get car from mongo db by id for get car name
    let car = await Car.findById(
      response.data.hits.hits[i]._source.plate_number
    ).exec();
    //get car_color from mongo db by id for get car color
    let car_color = await CarColor.findById(car?.color_id).exec();
    //get car_brand from mongo db by id for get car brand
    let car_brand = await CarBrand.findById(car?.brand_id).exec();
    //get owner from mongo db by id for get owner name
    let owner = await Personnel.findById(car?.owner).exec();
    let result = {
      camera_id: response.data.hits.hits[i]._source.camera_id,
      camera: camera?.name,
      time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
      car: car_brand,
      color: car_color,
      plate: response.data.hits.hits[i]._source.plate_number,
      owner: owner?.first_name + " " + owner?.last_name,
      allowed: owner?.camera_whitelist.includes(
        response.data.hits.hits[i]._source.camera_id
      )
        ? true
        : false,
    };
    _data.push(await result);
  }
  return _data;
}
//create json response humanLog report for send to client
export async function humanLogResponse(response: any) {
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
    let result = {
      camera_id: response.data.hits.hits[i]._source.camera_id,
      camera: camera?.name,
      time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
      numberOfPeople: response.data.hits.hits[i]._source.number_of_people,
      NumberOfPeople:
        schedule!?.config!?.max_people! >=
        response.data.hits.hits[i].number_of_people
          ? true
          : false,
    };
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
      time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
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
      time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
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
    if(cameraIds.includes(response.data.hits.hits[0]._source.alerts[i].labels.camera_id)){
      continue;
    }else{
      cameraIds.push(response.data.hits.hits[0]._source.alerts[i].labels.camera_id);
      let camera = await Camera.findById(
        response.data.hits.hits[0]._source.alerts[i].labels.camera_id
      ).exec();
      let result = {
        camera_id: response.data.hits.hits[0]._source.alerts[i].labels.camera_id,
        camera: camera?.name,
        time: new Date(
          Number(response.data.hits.hits[0]._source.alerts[i].labels.timestamp) *
            1000
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
  let _data: object[] = []
  let cameraIds: string[] = [];
  console.log(response.data.hits.hits[0]._source.alerts);
  for (let i = 0; i < response.data.hits.hits[0]._source.alerts.length; i++) {
    //get camera from mongo db by id for get camera name
    if (cameraIds.includes(response.data.hits.hits[0]._source.alerts[i].labels.camera_id)) {
      continue;
    } else {
      cameraIds.push(response.data.hits.hits[0]._source.alerts[i].labels.camera_id);
      let camera = await Camera.findById(response.data.hits.hits[0]._source.alerts[i].labels.camera_id).exec();

      //let cameras = await Camera.find({ section_id: camera?.section_id }).exec();

      let sections = await Section.find({section_id: camera?.section_id,}).exec();

      let department = await Departement.findById(sections[0]?.departement_id).exec();

      let result = {
        department: department?.name,
       sections: sections,
        time: new Date(
          Number(
            response.data.hits.hits[0]._source.alerts[i].labels.timestamp
          ) * 1000
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

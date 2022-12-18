import axios from "axios";
import { NextFunction } from "express";
import Model from "./../models/model";
import { ApiError } from "../error/error.handler";

//get connection string from enviroment variable
const dbUri = process.env["ELASTIC_SEARCH"] as string;
const trackerURL = process.env["TREACKER_SEARCH_URL"] as string;

//function for send request to elastic search and get data
export async function dynamicRequestToElasticSearch(
  cameras: string[] = [],
  personnels: string[] | null = [],
  models: string[] = [],
  probability: number[] = [],
  humanCounts: number[] = [],
  timeStart: string | undefined,
  timeEnd: string,
  model: string,
  page: number,
  perPage: number,
  next: NextFunction
) {
  try {
    //get hours from epoch time
    let start_hour: number = -1,
      end_hour: number = -1,
      start_minute: number = -1,
      end_minute: number = -1;

    if (timeStart) {
      start_hour = Number(new Date(Number(timeStart)).getUTCHours());
      start_minute =Number(new Date(Number(timeStart)).getUTCMinutes());
      end_hour =Number(new Date(Number(timeEnd)).getUTCHours());
      end_minute =Number(new Date(Number(timeEnd)).getUTCMinutes());
    }

    //create json response for client
    let jsonResuest: any = {};
    jsonResuest.size = perPage;
    jsonResuest.from = perPage * (page - 1) + 1;
    //create json query for elastic search
    jsonResuest.query = {
      bool: {
        filter: []
      }
    };

    let response: any;
    //create url for elastic search with model for name table in elastic search
    let baseurl: string = "";
    if (model !== "event") {
      //add filter for cameras if model is not event and cameras is not empty
      //cameras ai array string camera id
      if (cameras.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            camera_id: cameras
          }
        });
      }
      //add filter for personnels if personnels is not empty and model is not event
      //personnels ai array string personnel id
      if (personnels && personnels!.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            personnel_id: personnels
          }
        });
      }

      //add filter for models if models is not empty and model is not event and model is not event
      //models ai array string model id
      if (models.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            model: models
          }
        });
      }

      //add filter for confidence if confidence is not empty  and model is not event
      //confidence ai array string confidence number
      if (probability.length > 0) {
        jsonResuest.query.bool.filter.push({
          range: {
            confidence: {
              gte: probability[0],
              lte: probability[1]
            }
          }
        });
      }

      //add filter for human count if human count is not empty  and human count is not event
      //human count ai array string confidence number
      if (humanCounts.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            number_of_people: humanCounts
          }
        });
      }

      //add time filter if timeStart and timeEnd is not empty
      if (timeEnd !== "" && timeStart !== "") {
        jsonResuest.query.bool.filter.push({
          range: {
            timestamp: {
              gte: timeStart,
              lte: timeEnd
            }
          }
        });
      }

      // add time filter if timeStart and timeEnd is not empty
      // and add script for filter time between two hours
      if (end_hour > -1 && start_hour > -1) {
        jsonResuest.query.bool.filter.push({
          script: {
            script: {
              "source": "ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc.timestamp.value),ZoneId.of('Z')).getHour() >= params.minh && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc.timestamp.value),ZoneId.of('Z')).getHour() <= params.maxh && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc.timestamp.value),ZoneId.of('Z')).getMinute() >= params.minh && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc.timestamp.value),ZoneId.of('Z')).getMinute() <= params.maxh",
              "params": {
                "minh": start_hour,
                "maxh": end_hour,
                "minMinute": start_minute,
                "maxMinute": end_minute
              }
            }
          }
        });
      }

      //add filter for cameras with time roder
      jsonResuest.sort = [
        {
          timestamp: {
            order: "desc"
          }
        }
      ];

      //create url for elastic search with model for name table in elastic search
      baseurl = dbUri + "/" + model + "_log/_search";
    } else if (model === "event") {
      //add filter for cameras if model is not event and cameras is not empty
      //cameras ai array string camera id
      if (cameras.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            "log.camera_id": cameras
          }
        });
      }
      //add filter for personnels if personnels is not empty and model is not event
      //personnels ai array string personnel id
      if (personnels && personnels.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            logpersonnel_id: personnels
          }
        });
      }
      //add filter for models if models is not empty and model is not event and model is not event
      //models ai array string model id
      if (models.length > 0) {
        let model_name: string[] = [];
        for (let modl of models) {
          let _mod = await Model.findById(modl).exec();
          if (_mod) {
            if (_mod.category == "identification") {
              model_name.push("face");
            } else {
              model_name.push(_mod.category);
            }
          }
        }
        jsonResuest.query.bool.filter.push({
          terms: {
            type: model_name
          }
        });
      }

      //add filter for confidence if confidence is not empty  and model is not event
      //confidence ai array string confidence number
      if (probability.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            "log.confidence": probability
          }
        });
      }

      //add filter for human count if human count is not empty  and human count is not event
      //human count ai array string confidence number
      if (humanCounts.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            "log.number_of_people": humanCounts
          }
        });
      }

      //add time filter if timeStart and timeEnd is not empty
      if (timeEnd !== "" && timeStart !== "") {
        jsonResuest.query.bool.filter.push({
          range: {
            "log.timestamp": {
              gte: timeStart,
              lte: timeEnd
            }
          }
        });
      }

      //add time filter if timeStart and timeEnd is not empty
      //and add script for filter time between two hours
      if (end_hour > -1 && start_hour > -1) {
        jsonResuest.query.bool.filter.push({
          script: {
            script: {
              "source": "ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['log.timestamp'].value),ZoneId.of('Z')).getHour() >= params.minh && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['log.timestamp'].value),ZoneId.of('Z')).getHour() <= params.maxh && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['log.timestamp'].value),ZoneId.of('Z')).getMinute() >= params.minh && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['log.timestamp'].value),ZoneId.of('Z')).getMinute() <= params.maxh",
              "params": {
                "minh": start_hour,
                "maxh": end_hour,
                "minMinute": start_minute,
                "maxMinute": end_minute
            }
          }
        }
        });
      }

      //add filter for cameras with time roder
      jsonResuest.sort = [
        {
          "log.timestamp": {
            order: "desc"
          }
        }
      ];

      baseurl = dbUri + "/alerts/_search";
    }
    //send request to elastic search for get all  data with pagination
    response = await axios.get(baseurl, {
      headers: {
        "Content-Type": "application/json",
      },
      data: jsonResuest,
    });
    return response;
  } catch (err: any) {
    return next(new ApiError(500, "Error while getting data from elastic search"));
  }
}

export async function requestForGetPersonnel(personnelId: string) {
  const response = await axios.get(trackerURL, {
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      size: 1,
      query: {
        match: {
          personnel_id: personnelId
        }
      },
      sort: [
        {
          timestamp: {
            order: "desc"
          }
        }
      ]
    }
  });
  return response;
}



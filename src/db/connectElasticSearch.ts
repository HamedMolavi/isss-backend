import axios from "axios";
import { NextFunction } from "express";
import { ApiError } from "../error/error.handler";

//get connection string from enviroment variable
const dbUri = process.env["ELASTIC_SEARCH"] as string;

//function for send request to elastic search and get data
export async function dynamicRequestToElasticSearch(
  cameras: string[] = [],
  personnels: string[] = [],
  models: string[] = [],
  probability: number[] = [],
  timeStart: string,
  timeEnd: string,
  model: string,
  page: number,
  perPage: number,
  next: NextFunction
) {
  try {
    //create json response for client
    let jsonResuest: any = {};
    jsonResuest.size = perPage;
    jsonResuest.from = page;
    //create json query for elastic search
    jsonResuest.query = {
      bool: {
        filter: [],
      },
    };
    //add filter for cameras with time roder
    jsonResuest.sort = [
      {
        timestamp: {
          order: "desc",
        },
      },
    ];

    let response: any;

    if (model !== "event") {
      //add filter for cameras if model is not event and cameras is not empty
      //cameras ai array string camera id
      if (cameras.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            camera_id: cameras,
          },
        });
      }
      //add filter for personnels if personnels is not empty and model is not event
      //personnels ai array string personnel id
      if (personnels.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            personnel_id: personnels,
          },
        });
      }
      //add time filter if timeStart and timeEnd is not empty
      if (timeEnd !== "" && timeStart !== "") {
        jsonResuest.query.bool.filter.push({
          range: {
            timestamp: {
              gte: timeStart,
              lte: timeEnd,
            },
          },
        });
      }
      //add filter for models if models is not empty and model is not event and model is not event
      //models ai array string model id
      if (models.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            model: models,
          },
        });
      }

      //add filter for confidence if confidence is not empty  and model is not event
      //confidence ai array string confidence number
      if (probability.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            confidence: probability,
          },
        });
      }

      //create url for elastic search with model for name table in elastic search
      let baseurl: string = "";
      if (model !== "") {
        baseurl = dbUri + "/" + model + "_log/_search";
      }
      //send request to elastic search for get all  data with pagination
      response = await axios.get(baseurl, {
        headers: {
          "Content-Type": "application/json",
        },
        data: jsonResuest,
      });
    } else if (model === "event") {
    }
    return response;
  } catch (err: any) {
    return next(
      new ApiError(500, "Error while getting data from elastic search")
    );
  }
}

//function for send request to elastic search and get count data
export async function dynamicRequestToElasticSearchCount(
  cameras: string[] = [],
  personnels: string[] = [],
  models: string[] = [],
  model: string,
  next: NextFunction
) {
  try {
    //create json response for client
    let jsonResuest: any = {};
    //create json query for elastic search
    jsonResuest.query = {
      bool: {
        filter: [],
      },
    };

    let response: any;

    if (model !== "event") {
      //add filter for cameras if model is not event and cameras is not empty
      //cameras ai array string camera id
      if (cameras.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            camera_id: cameras,
          },
        });
      }
      //add filter for personnels if personnels is not empty and model is not event
      //personnels ai array string personnel id
      if (personnels.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            personnel_id: personnels,
          },
        });
      }
      //add filter for models if models is not empty and model is not event and model is not event
      //models ai array string model id
      if (models.length > 0) {
        jsonResuest.query.bool.filter.push({
          terms: {
            model: models,
          },
        });
      }
      //create url for elastic search with model for name table in elastic search
      let baseurl: string = "";
      if (model !== "") {
        baseurl = dbUri + "/" + model + "_log/_count";
      }
      //send request to elastic search for get all  data with pagination
      response = await axios.get(baseurl, {
        headers: {
          "Content-Type": "application/json",
        },
        data: jsonResuest,
      });
    } else if (model === "event") {
    }
    return response.data.count;
  } catch (err: any) {
    return next(
      new ApiError(500, "Error while getting data from elastic search")
    );
  }
}

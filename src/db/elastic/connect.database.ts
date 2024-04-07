import axios from "axios";
import { NextFunction } from "express";
import Model from "../mongo/models/model";
import { ApiError } from "../../types/classes/error.class";
import { Client } from '@elastic/elasticsearch';
import { IPlate } from "./model/plate";


//get connection string from enviroment variable
const dbUri = process.env["ELASTIC_SEARCH"] as string;
const trackerURL = process.env["TREACKER_SEARCH_URL"] as string;


export async function connectToElastic(connectionString: string) {
  const esClient = new Client({ node: connectionString });
  return esClient
}

export async function getLogFromElastic(_indx: string, _size: number, _from: number,
  timeRanges: Array<{ gte: string, lte: string }> = [],
  plates: Array<string>, cameras: Array<string>,
  brands: Array<string>, colors: Array<string>,
  personnels: Array<string>,human_count: Array<number>,allowed: Array<number>) {
  
  const fields = {
     "plate_number": plates,
     "camera_id": cameras,
     "personnel_id": personnels,  
     "brand": brands,
     "color": colors,
     "human_count":human_count,
     "allowed":allowed
  };
 
  let query_elastic = {
     index: _indx,
     size: _size ?? undefined,
     from: ((_from > 1 ? _from : 1) - 1) * _size,
     track_total_hits: true,
     query: {
       bool: {
         must: [
           ...Object.entries(fields)
             .filter(([, values]) => values && values.length > 0)
             .map(([field, values]) => ({
               bool: {
                 should: values.map(value => ({
                  term: {
                    [`${field}`]: value
                  }
                 })),
                 "minimum_should_match": 1
               }
             })),
           ...(timeRanges && timeRanges.length > 0 ? [{
             bool: {
               should: timeRanges.map(time => ({
                 range: {
                  timestamp: {
                     gte: time.gte,
                     lte: time.lte
                  }
                 }
               })),
               "minimum_should_match": 1
             }
           }] : [])
         ]
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
 
  const esRes = await process.esclient.search(query_elastic);
  return esRes;
 }



export async function postElastic(_index: string, log: IPlate) {
  const esRes = await process.esclient.index({
    index: _index,
    body: {
      ...log
    }
  })
  return esRes;
}

//function for send request to elastic search and get data
export async function dynamicRequestToElasticSearch(
  cameras: string[] = [],
  personnels: string[] | null = [],
  models: string[] = [],
  probability: number[] = [],
  humanCounts: number[] = [],
  times_epoch: any[] = [],
  // timeStart: string ,
  // timeEnd: string,
  model: string,
  page: number,
  perPage: number,
  plate: string | null,
  next: NextFunction
) {
  try {
    //create json response for client
    let jsonResuest: any = {};
    jsonResuest["size"] = perPage;
    jsonResuest["from"] = perPage * (page - 1);
    // jsonResuest["from"] = perPage * (page - 1) - 1;
    //jsonResuest["from"] = perPage > 0 ? perPage  :0;
    //create json query for elastic search
    jsonResuest.query = {
      bool: {
        filter: [],
        should: [],
        "minimum_should_match": 1
      },
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

      if (plate !== "") {
        jsonResuest.query.bool.filter.push({
          term: {
            "plate_number.keyword": plate
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
      if (times_epoch.length > 0) {
        for (let t of times_epoch) {
          jsonResuest.query.bool.should.push({
            range: {
              timestamp: {
                gte: t.gte,
                lte: t.lte
              }
            }
          });
        }

        // jsonResuest.query.bool.filter.push({
        //   range: {
        //     timestamp: {
        //       gte: timeStart,
        //       lte: timeEnd,
        //     },
        //   },
        // });
      }
      //"source": "ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc.timestamp.value),ZoneId.of('Z')).getHour() >= params.minh && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc.timestamp.value),ZoneId.of('Z')).getHour() <= params.maxh && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc.timestamp.value),ZoneId.of('Z')).getMinute() >= params.minMinute && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc.timestamp.value),ZoneId.of('Z')).getMinute() <= params.maxMinute",
      // add time filter if timeStart and timeEnd is not empty
      // and add script for filter time between two hours
      // if (end_hour.length > 0 && start_hour.length > 0) {
      //   jsonResuest.query.bool.filter.push({
      //     script: {
      //       script: {
      //         source:
      //           "(Instant.ofEpochMilli(doc['log.timestamp'].value).atZone(ZoneId.systemDefault()).toLocalTime()).isAfter(LocalTime.parse('" +
      //           start_hour +
      //           ":" +
      //           start_minute +
      //           ":01.000')) && (Instant.ofEpochMilli(doc['log.timestamp'].value).atZone(ZoneId.systemDefault()).toLocalTime()).isBefore(LocalTime.parse('" +
      //           end_hour +
      //           ":" +
      //           end_minute +
      //           ":01.000'))",
      //         params: {
      //           minh: start_hour,
      //           maxh: end_hour,
      //           minMinute: start_minute,
      //           maxMinute: end_minute,
      //         },
      //       },
      //     },
      //   });
      // }

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
      if (times_epoch.length > 0) {
        for (let t of times_epoch) {
          jsonResuest.query.bool.should.push({
            range: {
              "log.timestamp": {
                gte: t.gte,
                lte: t.lte
              }
            }
          });
        }
        // jsonResuest.query.bool.filter.push({
        //   range: {
        //     timestamp: {
        //       gte: timeStart,
        //       lte: timeEnd,
        //     },
        //   },
        // });
      }
      // "source": "ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['log.timestamp'].value),ZoneId.of('Z')).getHour() >= params.minh && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['log.timestamp'].value),ZoneId.of('Z')).getHour() <= params.maxh && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['log.timestamp'].value),ZoneId.of('Z')).getMinute() >= params.minMinute && ZonedDateTime.ofInstant(Instant.ofEpochMilli(doc['log.timestamp'].value),ZoneId.of('Z')).getMinute() <= params.maxMinute",
      //add time filter if timeStart and timeEnd is not empty
      //and add script for filter time between two hours
      // if (end_hour.length > 0 && start_hour.length > 0) {
      //   jsonResuest.query.bool.filter.push({
      //     script: {
      //       script: {
      //         source:
      //           "(Instant.ofEpochMilli(doc['log.timestamp'].value).atZone(ZoneId.systemDefault()).toLocalTime()).isAfter(LocalTime.parse('" +
      //           start_hour +
      //           ":" +
      //           start_minute +
      //           ":01.000')) && (Instant.ofEpochMilli(doc['log.timestamp'].value).atZone(ZoneId.systemDefault()).toLocalTime()).isBefore(LocalTime.parse('" +
      //           end_hour +
      //           ":" +
      //           end_minute +
      //           ":01.000'))",
      //         params: {
      //           minh: start_hour,
      //           maxh: end_hour,
      //           minMinute: start_minute,
      //           maxMinute: end_minute,
      //         },
      //       },
      //     },
      //   });
      // }

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
        "Content-Type": "application/json"
      },
      data: jsonResuest
    });
    return response;
  } catch (err: any) {
    return next(new ApiError(500, "Error while getting data from elastic search"));
  }
}

export async function requestForGetPersonnel(personnelId: string): Promise<any> {
  try {
    const response = await axios.get(trackerURL, {
      headers: {
        "Content-Type": "application/json",
      },
      data: {
        size: 1,
        query: {
          match: {
            personnel_id: personnelId,
          },
        },
        sort: [
          {
            timestamp: {
              order: "desc",
            },
          },
        ],
      },
    });
    return response;
  } catch (error) {
    return {};
  }
}

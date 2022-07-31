import axios from "axios";
import { ApiError } from "../error/error.handler";

//get connection string from enviroment variable
const dbUri = process.env["ELASTIC_SEARCH"] as string;
//send request to elastic search and get data
export async function requestToElasticSearch(
  cameras : string[],
  search: string,
  timeStart: string,
  timeEnd: string,
  model: string,
  page: number,
  perPage: number,
  next: Function
) {
  //create json response for client
  try {
    let response: any;
    if (search !== "") {
      //get data from elastic
      //format search to elastic search
      response = await axios.get(dbUri + "/" + model + "_log/_search", {
        headers: {
          'Content-Type': 'application/json'
      },
      data: {
          'from': page,
          'size': perPage,
          'query': {
            'bool': {
                'filter': [
                    {
                        'terms': {
                            'camera_id': cameras
                        }
                    },
                    {
                        'range': {
                            'timestamp': {
                                'gte': timeStart,
                                'lte': timeEnd
                            }
                        }
                    }
                ]
            }
        },
        'sort': [
            {
                'timestamp': {
                    'order': 'desc'
                }
            }
        ]
      }
      });
    } else {
      //send request to elastic search for get all  data with pagination
      response = await axios.get(
        dbUri + "/" + model + "_log/_search?pretty=true&q=*:*",
        {
          headers: {
            "Content-Type": "application/json",
          },
          data: {
            'from': page,
            'size': perPage,
            'sort': [
              {
                'timestamp': {
                  'order': "desc",
                },
              },
            ],
          },
        }
      );
    }
    return response;
  } catch (err: any) {
    return next(new ApiError(500, "Error while getting data from elastic search"));
  }
}

export async function requestToElasticSearchEvent(
  cameras : string[],
  models : string[],
  search: string,
  timeStart: string,
  timeEnd: string,
  page: number,
  perPage: number,
  next: Function,
  searchName?: string
) {
  //create json response for client
  try {
    let response: any;
    if (search !== "") {
      //get data from elastic
      //format search to elastic search
      if (searchName === "all") {
        response = await axios.get(dbUri + "/alerts/_search", {
          headers: {
            "Content-Type": "application/json",
          },
          data: {
            'from': page,
            'size': perPage,
            'query': {
              'bool': {
                'filter': [
                  {
                    'term': {
                      "alerts.labels.camera_id": cameras
                    },
                  },
                  {
                    'term': {
                      "alerts.labels.module": models,
                    },
                  },
                  {
                    'range': {
                      "alerts.labels.timestamp": {
                        gte: timeStart,
                        lte: timeEnd,
                      },
                    },
                  },
                ],
              },
            },
            'sort': [
              {
                "alerts.labels.timestamp.keyword": {
                  missing: "_last",
                },
              },
            ],
          },
        });
      } else if (searchName === "camera") {
        response = await axios.get(dbUri + "/alerts/_search", {
          headers: {
            "Content-Type": "application/json",
          },
          data: {
            'from': page,
            'size': perPage,
            'query': {
              'match': {
                "alerts.labels.camera_id": cameras,
              },
            },
            'sort': [
              {
                "alerts.labels.timestamp.keyword": {
                  missing: "_last",
                },
              },
            ],
          },
        });
      } else if (searchName === "date") {
        response = await axios.get(dbUri + "/alerts/_search", {
          headers: {
            "Content-Type": "application/json",
          },
          data: {
            'from': page,
            'size': perPage,
            'query': {
              'bool': {
                'filter': [
                  {
                    'term': {
                      "alerts.labels.timestamp": search,
                    },
                  },
                  {
                    'range': {
                      "alerts.labels.timestamp": {
                        'gte': timeStart,
                        'lte': timeEnd,
                      },
                    },
                  },
                ],
              },
            },
            'sort': [
              {
                "alerts.labels.timestamp.keyword": {
                  missing: "_last",
                },
              },
            ],
          },
        });
      } else if (searchName === "ai") {
        response = await axios.get(dbUri + "/alerts/_search", {
          headers: {
            "Content-Type": "application/json",
          },
          data: {
            'from': page,
            'size': perPage,
            'query': {
              'bool': {
                'filter': [
                  {
                    'terms': {
                      "alerts.labels.module": models,
                    },
                  },
                ],
              },
            },
            'sort': [
              {
                "alerts.labels.timestamp.keyword": {
                  missing: "_last",
                },
              },
            ],
          },
        });
      }
    } else {
      //send request to elastic search for get all  data with pagination
      response = await axios.get(dbUri + "/alerts/_search?pretty=true&q=*:*", {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          'from': page,
          'size': perPage,
        },
      });
    }
    return response;
  } catch (err: any) {
    return next(new ApiError(500, "Error while getting data from elastic search"));
  }
}

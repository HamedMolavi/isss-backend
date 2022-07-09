import axios from "axios";
import HttpException from "../error/HttpException";

//get connection string from enviroment variable
const dbUri = process.env["ELASTIC_SEARCH"] as string;
//send request to elastic search and get data
export async function requestToElasticSearch(
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
          "Content-Type": "application/json",
        },
        data: {
          from: page,
          size: perPage,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    camera_id: search,
                  },
                },
                {
                  range: {
                    timestamp: {
                      gte: timeStart,
                      lte: timeEnd,
                    },
                  },
                },
              ],
            },
          },
        },
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
            from: page,
            size: perPage,
          },
        }
      );
    }

    return response;
  } catch (err: any) {
    return next(new HttpException(500, err.message, model));
  }
}

export async function requestToElasticSearchEvent(
  search: string,
  timeStart: string,
  timeEnd: string,
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
      response = await axios.get(dbUri + "/alerts/_search", {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          from: page,
          size: perPage,
          query: {
            bool: {
              filter: [
                {
                  term: {
                    camera_id: search,
                  },
                },
                {
                  range: {
                    timestamp: {
                      gte: timeStart,
                      lte: timeEnd,
                    },
                  },
                },
              ],
            },
          },
        },
      });
    } else {
      //send request to elastic search for get all  data with pagination
      response = await axios.get(dbUri + "/alerts/_search?pretty=true&q=*:*", {
        headers: {
          "Content-Type": "application/json",
        },
        data: {
          from: page,
          size: perPage,
        },
      });
    }
    return response;
  } catch (err: any) {
    return next(new HttpException(500, err.message, "event"));
  }
}

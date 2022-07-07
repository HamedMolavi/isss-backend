import axios from "axios";
import HttpException from "../error/HttpException";

//get connection string from enviroment variable
const dbUri = process.env["ELASTIC_SEARCH"] as string;

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
    return next(new HttpException(500, err.message, "sabotage"));
  }
}

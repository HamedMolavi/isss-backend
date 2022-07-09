import { Router, Request, Response, NextFunction } from "express";
import HttpException from "../../../error/HttpException";
import date2Epokh from "../../../tools/convertTimeEpokh";
import { getTokenAndVerify } from "../../../tools/authentication";
import {
  eventLogResponse,
  faceLogResponse,
  fireLogResponse,
  humanLogResponse,
  plateLogResponse,
  sabotageLogResponse,
} from "../../../tools/createlogReport";
import {
  requestToElasticSearch,
  requestToElasticSearchEvent,
} from "../../../db/elasticsearch";

//create router for add to routes file
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
  res.locals.currentUser = req.user;
  res.locals.errors = req.flash("error");
  res.locals.infos = req.flash("info");
  next();
});

//get connection string from enviroment variable
const dbUri = process.env["ELASTIC_SEARCH"] as string;

//route for get sabotage list
router.get(
  "/:model",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get model from url request
      let model = req.params.model;
      //get token from header request and verify
      let token = getTokenAndVerify(req, "user", next);

      //get page from url
      let strPage = req.query.page as string;
      let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
      //get perPage from url
      let strPerPage = req.query.perPage as string;
      let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
      //get search from url
      let search = (req.query.search as string) || "";
      let response: any;
      let timeStartScientificSymbol: string = "";
      let timeEndScientificSymbol: string = "";
      if (search) {
        //get body from request
        const { time, date_start, date_end } = req.body;
        if (!time || !date_start || !date_end) {
          req.flash("error", "Please fill all fields");
          return next(new HttpException(400, "Bad Request", "sabotage"));
        }

        //convert date_start to epokh
        timeStartScientificSymbol = date2Epokh(date_start, time);
        timeEndScientificSymbol = date2Epokh(date_end, time);
      }

      let _data: object[] = [];

      if (model === "event") {
        //get event data from elastic search
        response = await requestToElasticSearchEvent(
          search,
          timeStartScientificSymbol,
          timeEndScientificSymbol,
          page,
          perPage,
          next
        );
        //create json response for client
        _data = await eventLogResponse(response);
      } else {
        //get log for other models data from elastic
        response = await requestToElasticSearch(
          search,
          timeStartScientificSymbol,
          timeEndScientificSymbol,
          model,
          page,
          perPage,
          next
        );
        //create json response for client
        if (model === "sabotage") {
          _data = await sabotageLogResponse(response);
        } else if (model === "plate") {
          _data = await plateLogResponse(response);
        } else if (model === "human") {
          _data = await humanLogResponse(response);
        } else if (model === "fire") {
          _data = await fireLogResponse(response);
        } else if (model === "face") {
          _data = await faceLogResponse(response);
        }
      }

      //return data to client
      return res.status(200).json({
        message: "Success",
        data: _data,
      });
    } catch (err: any) {
      return next(new HttpException(500, err.message, "sabotage"));
    }
  }
);

export default router;

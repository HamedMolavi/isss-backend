import { Router, Request, Response, NextFunction } from "express";
import HttpException from "../../../error/HttpException";
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
import { date2Epokh } from "../../../tools/convertTime";

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
router.post(
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
      page = ((page -1) * perPage )+ 1;

      //get search from url
      let search = (req.query.search as string) || "";
      //get searchName from url
      let searchName = (req.query.name as string) || "";

      let response: any;
      let timeEpokhStart: string = "";
      let timeEpokhEnd: string = "";
      let _allowed: boolean | undefined = undefined;
      let _carBrand: string | null = null;
      let _carColor: string | null = null;
      let _owner: string | null = null;
      if (search) {
        //get body from request
        const {
          time_start,
          time_end,
          date_start,
          date_end,
          car_brand,
          car_color,
          owner,
          allowed,
        } = req.body;
        _allowed = Boolean(allowed) ?? undefined;
        _carBrand = car_brand ?? null;
        _carColor = car_color ?? null;
        _owner = owner ?? null;
        if (time_start && time_end && date_start && date_end) {
          //convert date_start to epokh
          timeEpokhStart = date2Epokh(date_start, time_start);
          timeEpokhEnd = date2Epokh(date_end, time_end);
        }
        // else
        // if(!time_start || !time_end || !date_start || !date_end ){
        //   req.flash("error", "Time and date is required");
        //   return next(new HttpException(400, "Time and date is required", model));
        // }
      }

      let _data: object[] = [];

      if (model === "event") {
        //get event data from elastic search
        response = await requestToElasticSearchEvent(
          search,
          timeEpokhEnd,
          timeEpokhStart,
          page,
          perPage,
          next,
          searchName
        );
        //report error on data null or undefined
        if (!response) {
          req.flash("error", "Data is null or undefined");
          return next(
            new HttpException(404, "Data is null or undefined", model)
          );
        }
        //create json response for client
        _data = await eventLogResponse(response);
      } else {
        //get log for other models data from elastic
        response = await requestToElasticSearch(
          search,
          timeEpokhStart,
          timeEpokhEnd,
          model,
          page,
          perPage,
          next
        );
        //create json response for client
        if (model === "sabotage") {
          _data = await sabotageLogResponse(response);
        } else if (model === "plate") {
          if (
            (_carBrand === null || _carColor === null || _owner === null) &&
            search
          ) {
            req.flash("error", "Car brand, car color and owner is required");
            return next(
              new HttpException(
                400,
                "Car brand, car color and owner is required",
                model
              )
            );
          }
          _data = await plateLogResponse(
            response,
            _carBrand,
            _carColor,
            _owner,
            _allowed,
            search
          );
        } else if (model === "human") {
          _data = await humanLogResponse(response, _allowed);
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

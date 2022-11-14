import { Router, Request, Response, NextFunction } from "express";
import { getTokenAndVerify } from "../../tools/authentication";
import { eventLogResponse, faceLogResponse, fireLogResponse, humanLogResponse, plateLogResponse, sabotageLogResponse } from "../../tools/createlogReport";
import { date2Epokh } from "../../tools/convertTime";
import { ApiError } from "../../error/error.handler";
import { dynamicRequestToElasticSearch } from "../../db/connectElasticSearch";

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
const const_role = process.env.const_role || "user";

//route for get sabotage list
router.post("/:model", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get model from url request
    let model = req.params.model;
    //send error if model is not defined
    if (model !== "face" && model !== "fire" && model !== "human" && model !== "plate" && model !== "sabotage" && model !== "event") {
      req.flash("error", "Model not found");
      return next(new ApiError(404, "Model not found"));
    }
    //get token from header request and verify
    let token = getTokenAndVerify(req, const_role, next);
    if (!token) {
      return null;
    }

    //get page from url
    let strPage = req.query.page as string;
    let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
    //get perPage from url
    let strPerPage = req.query.perPage as string;
    let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
    // page = (page - 1) * perPage + 1;

    //get search from url
    let search = (req.query.search as string) || "";

    let response: any;
    let timeEpokhStart,
      timeEpokhEnd: string = "";
    let _timeStart,
      _timeEnd = "";
    let _allowed: boolean | null = null;
    let _carBrand,
      _carColor,
      _owner: string[] | null = null;
    let _cameras,
      _models,
      _personnels: string[] | null = [];
    let _probabilities,
      _humanCounts: number[] = [];
    if (search) {
      //get body from request
      const { time_start, time_end, date_start, date_end, car_brand, car_color, owner, allowed, cameras, models, personnels, probabilities, humanCounts } = req.body;
      _humanCounts = humanCounts;
      _personnels = personnels;
      _cameras = cameras;
      _models = models;
      _probabilities = probabilities;
      _allowed = Boolean(allowed) ?? null;
      _carBrand = car_brand ?? null;
      _carColor = car_color ?? null;
      _owner = owner ?? null;
      _timeStart = time_start ?? "";
      _timeEnd = time_end ?? "";
      if (time_start && time_end && date_start && date_end) {
        //convert date_start to epokh
        if (!date_start.includes("/") || !date_end.includes("/")) {
          req.flash("error", "Date format is not correct");
          next(new ApiError(400, "Date format is not correct"));
        }
        timeEpokhStart = date2Epokh(date_start, time_start);
        timeEpokhEnd = date2Epokh(date_end, time_end);
      }
    }

    let _data: object[] = [];
    //get log for other models data from elastic
    response = await dynamicRequestToElasticSearch(_cameras, _personnels, _models, _probabilities, _humanCounts, timeEpokhStart, timeEpokhEnd, model, page, perPage, next);
    if (!response) {
      req.flash("error", "Data is null or undefined");
      return next(new ApiError(404, "Data is null or undefined"));
    }
    //create json response for client
    if (model === "sabotage") {
      _data = await sabotageLogResponse(response,_timeStart , _timeEnd);
    } else if (model === "plate") {
      if ((_carBrand === null || _carColor === null || _owner === null) && search) {
        return next(new ApiError(400, `car_brand, car_color, owner is required`));
      }
      _data = await plateLogResponse(response, _carBrand, _carColor, _owner, _allowed, Boolean(search),_timeStart , _timeEnd);
    } else if (model === "human") {
      _data = await humanLogResponse(response, _allowed, Boolean(search),_timeStart , _timeEnd);
    } else if (model === "fire") {
      _data = await fireLogResponse(response,_timeStart , _timeEnd);
    } else if (model === "face") {
      _data = await faceLogResponse(response, _allowed, Boolean(search),_timeStart , _timeEnd);
    } else if (model === "event") {
      _data = await eventLogResponse(response,_timeStart , _timeEnd);
    }

    //return data to client
    return res.status(200).json({
      success: true,
      data: _data,
      page: strPage,
      perPage: perPage,
      total: search ? _data.length : response.data.hits.total.value,
      pages: Math.ceil((search ? _data.length : response.data.hits.total.value) / perPage),
    });
  } catch (err: any) {
    return next(new ApiError(500, "Internal server error ," + err));
  }
});

export default router;

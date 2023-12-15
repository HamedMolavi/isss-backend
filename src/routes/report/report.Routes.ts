import { Router, Request, Response, NextFunction } from "express";
import { eventLogResponse, faceLogResponse, fireLogResponse, humanLogResponse, plateLogResponse, sabotageLogResponse } from "../../tools/log.tools";
import Time from "../../tools/time.tools";
import { ApiError } from "../../types/classes/error.class";
import { dynamicRequestToElasticSearch } from "../../db/elastic/connect.database";
import { englishPlateDict } from "../../tools/plate.tools";
import { Clock } from "../../types/interfaces/time.interface";

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

type Input = {
  time_start: string | undefined;
  time_end: string | undefined;
  date_start: string | undefined;
  date_end: string | undefined;
  car_brand: string[] | undefined;
  car_color: string[] | undefined;
  owner: string[] | undefined;
  allowed: boolean | undefined;
  cameras: string[] | undefined;
  model: string[] | undefined;
  personnels: string[] | undefined;
  probabilities: number[] | undefined;
  humanCounts: number[] | undefined;
  plate: Plate | undefined;
}
type Epoch = {
  start: string;
  end: string;
}
type Plate = {
  first: string,
  second: string,
  third: string,
  fourth: string,
  fifth: string,
}

//route for get sabotage list
router.post("/:model", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get model from url request
    let model = req.params.model;
    let _timezone = req.query.timez as string;
    //send error if model is not defined
    if (model !== "face" && model !== "fire" && model !== "human" && model !== "plate" && model !== "sabotage" && model !== "event") {
      req.flash("error", "Model not found");
      return next(new ApiError(404, "Model not found"));
    }
    //get token from header request and verify
    //  let token = getTokenAndVerify(req, const_role, next);
    //  if (!token) {
    //    return null;
    //  }
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
    let epoch: Epoch = {
      start: "",
      end: ""
    }
    let input: Input = {
      time_start: undefined,
      time_end: undefined,
      date_start: undefined,
      date_end: undefined,
      car_brand: undefined,
      car_color: undefined,
      owner: undefined,
      allowed: false,
      cameras: undefined,
      model: undefined,
      personnels: undefined,
      probabilities: undefined,
      humanCounts: undefined,
      plate: undefined
    }

    let times_epoch: object[] = [];
    if (search) {
      //get body from request
      input = req.body;
      if (input.time_start && input.time_end && input.date_start && input.date_end) {
        //convert date_start to epokh
        if (!input.date_start.includes("/") || !input.date_end.includes("/")) {
          req.flash("error", "Date format is not correct");
          next(new ApiError(400, "Date format is not correct"));
        }
        epoch.start = String(Time.toTimestamp(input.date_start, input.time_start as Clock));
        epoch.end = String(Time.toTimestamp(input.date_end, input.time_end as Clock));
        times_epoch = Time.getEpochList(input.date_start, input.date_end, input.time_start as Clock, input.time_end as Clock, _timezone);
        //let timesEpokhEnd = getEpochList();
      };
    };
    let plate_number_engglish: string = "";
    if (!!input.plate && Object.values(input.plate).reduce((pre, curr)=> pre + (!!curr ? 1:0), 0)) { // all of fields are there
      plate_number_engglish = `${input.plate.first}${englishPlateDict[input.plate.second]}${input.plate.third}${input.plate.fifth}`;
    };

    let _data: object[] = [];
    //get log for other models data from elastic
    response = await dynamicRequestToElasticSearch(
      input.cameras,
      input.personnels,
      input.model,
      input.probabilities,
      input.humanCounts,
      times_epoch,
      // epoch.start,
      // epoch.end,
      model === "face" ? model + "ys1" : model,
      page,
      perPage,
      plate_number_engglish,
      next
    );
    if (!response) {
      req.flash("error", "Data is null or undefined");
      return next(new ApiError(404, "Data is null or undefined"));
    }
    //create json response for client
    if (model === "sabotage") {
      _data = await sabotageLogResponse(response, epoch.start, epoch.end, _timezone);
    } else if (model === "plate") {
      // if ((input.car_brand === null || input.car_color === null || input.owner === null) && search) {
      //   return next(new ApiError(400, `car_brand, car_color, owner is required`));
      // }
      _data = await plateLogResponse(response, input.car_brand, input.car_color, input.owner, Boolean(input.allowed), Boolean(search), _timezone);
    } else if (model === "human") {
      _data = await humanLogResponse(response, input.allowed, Boolean(search), _timezone);
    } else if (model === "fire") {
      _data = await fireLogResponse(response, _timezone);
    } else if (model === "face") {
      let x = Boolean(search)
      _data = await faceLogResponse(response, input.allowed, Boolean(search), _timezone);
    } else if (model === "event") {
      _data = await eventLogResponse(response, _timezone);
    }

    //return data to client
    return res.status(200).json({
      success: true,
      data: _data,
      page: strPage,
      perPage: perPage,
      total: response.data.hits.total.value ?? _data.length,
      pages: Math.ceil((response.data.hits.total.value ?? _data.length) / perPage),
    });
  } catch (err: any) {
    return next(new ApiError(500, "Internal server error ," + err));
  }
});

export default router;

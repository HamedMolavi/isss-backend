import { Router, Request, Response, NextFunction } from "express";
import { eventDepartmentLogResponse } from "../../tools/log.tools";
import { ApiError } from "../../types/classes/error.class";
import { Access } from "../../types/enums/access.enum";
import Time from "../../tools/time.tools";
import { Clock } from "../../types/interfaces/time.interface";

//get user role from enviroment variable
const const_role = process.env.const_role || "user";

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
router.post("", async function (req: Request, res: Response, next: NextFunction) {
  try {
    //get model from url request
    //let model = req.params.model;
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
    page = (page - 1) * perPage + 1;
    //get search from url
    let search = (req.query.search as string) || "";
    let response: any;
    //get searchName from url
    let searchName = (req.query.name as string) || "";

    let timeEpokhStart: string = "";
    let timeEpokhEnd: string = "";
    let _cameras: string[] = [];
    let _models: string[] = [];
    if (search) {
      //get body from request
      const { time_start, time_end, date_start, date_end, cameras, models } = req.body;
      _models = models ?? [];
      _cameras = cameras ?? [];
      if (time_start && time_end && date_start && date_end) {
        //convet time to timeStamp
        timeEpokhStart = String(Time.toTimestamp(date_start, time_start as Clock));
        timeEpokhEnd = String(Time.toTimestamp(date_end, time_end as Clock));
      }
    }

    let _data: object[] = [];
    //get event data from elastic search
    //   response = await requestToElasticSearchEvent(
    //     _cameras,
    //     _models,
    //     search,
    //     timeEpokhStart,
    //     timeEpokhEnd,
    //     page,
    //     perPage,
    //     next,
    //     searchName
    //   );
    if (!response) {
      req.flash("error", "Data is null or undefined");
      return next(new ApiError(404, "Data is null or undefined"));
    }
    //create json response for client
    _data = await eventDepartmentLogResponse(response);

    //return data to client
    return res.status(200).json({
      success: true,
      data: _data,
    });
  } catch (err: any) {
    return next(new ApiError(500, "Internal server error ," + err));
  }
});

export default router;

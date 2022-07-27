import { Router, Request, Response, NextFunction } from "express";
import HttpException from "../../../error/HttpException";
import { getTokenAndVerify } from "../../../tools/authentication";
import { eventDepartmentLogResponse } from "../../../tools/createlogReport";
import { requestToElasticSearchEvent } from "../../../db/elasticsearch";
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
  "",
  async function (req: Request, res: Response, next: NextFunction) {
    try {
      //get model from url request
      //let model = req.params.model;
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
      //get searchName from url
      let searchName = (req.query.name as string) || "";

      let timeEpokhStart: string = "";
      let timeEpokhEnd: string = "";
      if (search) {
        //get body from request
        const { time_start , time_end, date_start, date_end } = req.body;
        if (time_start && time_end && date_start && date_end) {
          //convet time to timeStamp
          timeEpokhStart = date2Epokh(date_start, time_start);
          timeEpokhEnd = date2Epokh(date_end, time_end);
        }
      }

      let _data: object[] = [];
      //get event data from elastic search
      response = await requestToElasticSearchEvent(
        search,
        timeEpokhStart,
        timeEpokhEnd,
        page,
        perPage,
        next,
        searchName
      );
      //create json response for client
      _data = await eventDepartmentLogResponse(response);

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

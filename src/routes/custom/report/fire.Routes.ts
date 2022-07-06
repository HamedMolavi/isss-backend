import { Router, Request, Response, NextFunction } from "express";
import HttpException from "../../../error/HttpException";
import axios from "axios";
import date2Epokh from "../../../tools/convertTimeEpokh";
import { getTokenAndVerify } from "../../../tools/authentication";
import ModelToCamera from "../../../models/modelToCamera";
import Camera from "../../../models/camera";
import Car from "../../../models/car";
import CarColor from "../../../models/carColor";
import CarBrand from "../../../models/carBrand";
import Personnel from "../../../models/personnel";

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


//route for get fire list  
router.get("", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get token from header request and verify
        let token = getTokenAndVerify(req, "user", next);

        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
        //get search from url
        let search = req.query.search as string || "";
        console.log(search);
        let response: any;
        if (search !== "") {
            //get body from request
            const { time, date_start, date_end, probability } = req.body;
            if (!time || !date_start || !date_end) {
                req.flash("error", "Please fill all fields");
                return next(new HttpException(400, "Bad Request", "sabotage"));
            }
            //convert date_start to epokh
            let timeStartScientificSymbol = date2Epokh(date_start, time);
            let timeEndScientificSymbol = date2Epokh(date_end, time);

            //get data from elastic
            response = await axios.get(dbUri + '/fire_log/_search', {
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
                                    'term': {
                                        'camera_id': search
                                    }
                                },
                                {
                                    'range': {
                                        'timestamp': {
                                            'gte': timeStartScientificSymbol,
                                            'lte': timeEndScientificSymbol
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            });
        } else {
            response = await axios.get(dbUri + '/fire_log/_search', {
                headers: {
                    'Content-Type': 'application/json'
                },
                // data: '\n{\n  \n}',
                data: {
                    'from': page,
                    'size': perPage
                }
            });
        }

        //ceate json response
        let _data: object[] = [];
        for (let i = 0; i < response.data.hits.hits.length; i++) {
            //get camera from mongo db by id for get camera name
            let camera = await Camera.findById(response.data.hits.hits[i]._source.camera_id).exec();
            let result = {
                camera_id: response.data.hits.hits[i]._source.camera_id,
                camera: camera?.name,
                time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
                probability: response.data.hits.hits[i]._source.confidence,
            };
            _data.push(await result);
        };
        //return data to client
        return res.status(200).json({
            message: "Success",
            data: _data,
        });

    } catch (err: any) {
        return next(new HttpException(500, err.message, "sabotage"));
    }
});

export default router;
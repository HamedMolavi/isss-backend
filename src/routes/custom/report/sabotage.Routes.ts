import { Router, Request, Response, NextFunction, query } from "express";
import HttpException from "../../../error/HttpException";
import axios from "axios";
import date2Epokh from "../../../tools/convertTimeEpokh";
import { getTokenAndVerify } from "../../../tools/authentication";
import Camera from "../../../models/camera";
import ModelToCamera from "../../../models/modelToCamera";

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
        let response: any;
        if (search !== "") {

            //get body from request
            const { time, date_start, date_end } = req.body;
            if (!time || !date_start || !date_end) {
                req.flash("error", "Please fill all fields");
                return next(new HttpException(400, "Bad Request", "sabotage"));
            }
            //convert date_start to epokh
            let timeStartScientificSymbol = date2Epokh(date_start, time);
            let timeEndScientificSymbol = date2Epokh(date_end, time);
            console.log(search);
            //get data from elastic
            response = await axios.get(dbUri + '/sabotage_log/_search', {
                headers: {
                    'Content-Type': 'application/json'
                },
                // data: '\n{\n  "query": {\n    "bool": {\n      "filter": [\n        {\n          "term": {\n            "camera_id": "628dc28ef014bc89f0280c4a"\n          }\n        },\n        {\n          "range": {\n            "timestamp": {\n              "gte": 10,\n              "lte": 20\n            }\n          }\n        }\n      ]\n    }\n  }\n}',
                data: {
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
            response = await axios.get(dbUri + '/sabotage_log/_search?pretty=true&q=*:*', {
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
        let data: any;
        data = response.data.hits.hits.map(async (item: any) => {
            let _time = new Date(item._source.properties.timestamp).getTime();
            let model2camera = await ModelToCamera.findById('62bfe6ae54d90e82d9ba598b').exec();
            let camera = await Camera.findById(model2camera?.camera_id).exec();
            let result = {
                camera: camera?.name,
                time: _time,
            }
            // let camera = await Camera.findById('62c009a3fb115e110df9b460').exec();
            // console.log(camera);
            // let model2camera = await ModelToCamera.findOne({ _id: item._source.properties.m2c_id }).exec();
            data.push(result);
            console.log(result);
            //return result;
        });
        console.log(data);
        //return data to client
        return res.status(200).json({
            message: "Success",
            data: response.data.hits.hits,
        });

    } catch (err: any) {
        return next(new HttpException(500, err.message, "sabotage"));
    }
});

export default router;
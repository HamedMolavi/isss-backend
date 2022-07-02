import { Router, Request, Response, NextFunction } from "express";
import HttpException from "../../../error/HttpException";
import axios from "axios";
import date2Epokh from "../../../tools/convertTimeEpokh";
import { getTokenAndVerify } from "../../../tools/authentication";
import ModelToCamera from "../../../models/modelToCamera";
import Camera from "../../../models/camera";

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
            response = await axios.get(dbUri + '/fire/_search', {
                headers: {
                    'Content-Type': 'application/json'
                },
                data: {
                    'from': (page - 1) * perPage,
                    'size': perPage,
                    'query': {
                        'bool': {
                            'filter': [
                                {
                                    'term': {
                                        'properties.camera_id': search
                                    }
                                },
                                {
                                    'range': {
                                        'properties.timestamp': {
                                            'gte': timeStartScientificSymbol,
                                            'lte': timeEndScientificSymbol
                                        }
                                    }
                                },
                                {
                                    'range': {
                                        'properties.confidence': {
                                            'gte': probability
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            });
        } else {
            response = await axios.get(dbUri + '/fire/_search?pretty=true&q=*:*', {
                headers: {
                    'Content-Type': 'application/json'
                },
                // data: '\n{\n  \n}',
                data: {
                    'from': (page - 1) * perPage,
                    'size': perPage
                }
            });
        }

        //ceate json response
        let data: [{}] = [{}];
        data = response.data.hits.hits.map(async (item: any) => {
            let model2camera = await ModelToCamera.findOne({ _id: item._source.properties.m2c_id }).exec();
            return {

                camera: await Camera.findById(model2camera?.camera_id).exec(),
                time: new Date(item._source.properties.timestamp).getTime(),
                probability: item._source.properties.confidence,
            }
        });

        //return data to client
        return res.status(200).json({
            message: "Success",
            report: data
        });

    } catch (err: any) {
        return next(new HttpException(500, err.message, "sabotage"));
    }
});

export default router;
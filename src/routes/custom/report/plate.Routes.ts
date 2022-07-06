import { Router, Request, Response, NextFunction, query } from "express";
import HttpException from "../../../error/HttpException";
import axios from "axios";
import date2Epokh from "../../../tools/convertTimeEpokh";
import { getTokenAndVerify } from "../../../tools/authentication";
import Car from "../../../models/car";
import modelToCamera from "../../../models/modelToCamera";
import Camera from "../../../models/camera";
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
        let carDB: any;
        let model2camera: any;
        let _car: any;
        let _color: any;
        if (search !== "") {

            //get body from request
            const { camera_id, time, date_start, date_end, owner, car, color } = req.body;
            if (!camera_id || !time || !date_start || !date_end || !owner) {
                req.flash("error", "Please fill all fields");
                return next(new HttpException(400, "Bad Request", "Plate License"));
            }
            carDB = await Car.findOne({ owner: owner }).exec();
            if (!carDB) {
                req.flash("error", "Owner not found");
                return next(new HttpException(400, "Car Not Found", "Plate License"));
            }

            model2camera = await modelToCamera.findOne({ camera_id: camera_id }).exec();
            if (!model2camera) {
                req.flash("error", "Camera not found");
                return next(new HttpException(400, "Camera Not Found", "Plate License"));
            }
            _car = car;
            _color = color;
            //convert date_start to epokh
            let timeStartScientificSymbol = date2Epokh(date_start, time);
            let timeEndScientificSymbol = date2Epokh(date_end, time);

            //get data from elastic
            response = await axios.get(dbUri + '/plate_log/_search', {
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
            response = await axios.get(dbUri + '/plate_log/_search?pretty=true&q=*:*', {
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
            //get car from mongo db by id for get car name
            let car = await Car.findById(response.data.hits.hits[i]._source.plate_number).exec();
            //get car_color from mongo db by id for get car color
            let car_color = await CarColor.findById(car?.color_id).exec();
            //get car_brand from mongo db by id for get car brand
            let car_brand = await CarBrand.findById(car?.brand_id).exec();
            //get owner from mongo db by id for get owner name
            let owner = await Personnel.findById(car?.owner).exec();
            let result = {
                camera_id: response.data.hits.hits[i]._source.camera_id,
                camera: camera?.name,
                time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
                car: car_brand,
                color: car_color,
                plate: response.data.hits.hits[i]._source.plate_number,
                owner: owner?.first_name + " " + owner?.last_name,
                allowed : owner?.camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id) ? true : false
            };
            _data.push(await result);
        };

        //return data to client
        return res.status(200).json({
            message: "Success",
            report: _data
        });

    } catch (err: any) {
        return next(new HttpException(500, err.message, "Plate License"));
    }
});

export default router;
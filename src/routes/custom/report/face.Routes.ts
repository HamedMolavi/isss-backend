import { Router, Request, Response, NextFunction, query } from "express";
import HttpException from "../../../error/HttpException";
import axios from "axios";
import date2Epokh from "../../../tools/convertTimeEpokh";
import { getTokenAndVerify } from "../../../tools/authentication";
import Personnel, { IPersonnel } from "../../../models/personnel";
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

//route for get face list  
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
        let personnel: any;
        if (search !== "") {

            //get body from request
            const { time, date_start, date_end, personnel_id } = req.body;
            if (!time || !date_start || !date_end || !personnel_id) {
                req.flash("error", "Please fill all fields");
                return next(new HttpException(400, "Bad Request", "Face Recognication"));
            }
            //convert date_start to epokh
            let timeStartScientificSymbol = date2Epokh(date_start, time);
            let timeEndScientificSymbol = date2Epokh(date_end, time);

            //get personnel with personnel_id from DB
            personnel = await Personnel.findOne({ _id: personnel_id }).exec();

            //get data from elastic
            response = await axios.get(dbUri + '/face_log/_search', {
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
            response = await axios.get(dbUri + '/face_log/_search?pretty=true&q=*:*', {
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
            //get personnel from mongo db by id
            let _personnel: IPersonnel | null;
            if (response.data.hits.hits[i]._source.personnel_id !== "-1") {
                _personnel = await Personnel.findById(response.data.hits.hits[i]._source.personnel_id).exec();
            }else{
                _personnel = null;
            }
            //get camera from mongo db by id for get camera name
            let camera = await Camera.findById(response.data.hits.hits[i]._source.camera_id).exec();
            let result = {
                camera_id: response.data.hits.hits[i]._source.camera_id,
                camera: camera?.name,
                time: new Date(response.data.hits.hits[i]._source.timestamp).getTime(),
                fullName: _personnel?.first_name + " " + personnel?.last_name,
                Allowed: _personnel?.camera_whitelist.includes(response.data.hits.hits[i]._source.camera_id) ? true : false
            };
            _data.push(await result);
        };

        //return data to client
        return res.status(200).json({
            message: "Success",
            data: _data,
        });

    } catch (err: any) {
        return next(new HttpException(500, err.message, "Face Recognication"));
    }
});

export default router;
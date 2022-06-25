import { Router, Request, Response, NextFunction, query } from "express";
import HttpException from "../../error/HttpException";
import axios from "axios";
import reverseString from "../../tools/reverseString";
import date2Epokh from "../../tools/convertTimeEpokh";
//import elastic from "./../../db/elastic"


//create router for add to routes file 
const router: Router = Router();

//add error handler middleware
router.use(function (req: Request, res: Response, next: NextFunction) {
    res.locals.currentUser = req.user;
    res.locals.errors = req.flash("error");
    res.locals.infos = req.flash("info");
    next();
});


//route for get sabotage list  
router.get("/sabotage", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

        //get body from request
        const { camera_id, time, date_start, date_end } = req.body;
        if (!camera_id || !time || !date_start || !date_end) {
            req.flash("error", "Please fill all fields");
            return next(new HttpException(400, "Bad Request", "modelReport"));
        }
        //convert date_start to epokh
        let timeStartScientificSymbol = date2Epokh(date_start , time);
        let timeEndScientificSymbol = date2Epokh(date_end , time);

        //get data from elastic
        const response = await axios.get('http://services.ariapa.com:9200/sabotage/_search', {
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                'query': {
                    'bool': {
                        'filter': [
                            {
                                'term': {
                                    'properties.camera_id': camera_id
                                }
                            },
                            {
                                'range': {
                                    'properties.timestamp': {
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
        //return data to client
        return res.status(200).json({
            message: "Success",
            report: response.data
        });

    } catch (err: any) {
        return next(new HttpException(500, err.message, "modelReport"));
    }
});

export default router;
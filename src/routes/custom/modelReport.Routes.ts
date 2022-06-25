import { Router, Request, Response, NextFunction, query } from "express";
import HttpException from "../../error/HttpException";
import axios from "axios";
import date2Epokh from "../../tools/convertTimeEpokh";
import Personnel from "../../models/personnel";
import Car from "../../models/car";
import modelToCamera from "../../models/modelToCamera";


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
router.post("/sabotage", async function (req: Request, res: Response, next: NextFunction) {
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
            return next(new HttpException(400, "Bad Request", "sabotage"));
        }
        //convert date_start to epokh
        let timeStartScientificSymbol = date2Epokh(date_start, time);
        let timeEndScientificSymbol = date2Epokh(date_end, time);

        //get data from elastic
        const response = await axios.get(dbUri + '/sabotage/_search', {
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
        return next(new HttpException(500, err.message, "sabotage"));
    }
});





//route for get fire Detection list  
router.post("/fire", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

        //get body from request
        const { camera_id, time, date_start, date_end, probability } = req.body;
        if (!camera_id || !time || !date_start || !date_end || !probability) {
            req.flash("error", "Please fill all fields");
            return next(new HttpException(400, "Bad Request", "Fire Detection"));
        }
        //convert date_start to epokh
        let timeStartScientificSymbol = date2Epokh(date_start, time);
        let timeEndScientificSymbol = date2Epokh(date_end, time);

        //get data from elastic
        const response = await axios.get(dbUri + '/fire/_search', {
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
        //return data to client
        return res.status(200).json({
            message: "Success",
            report: response.data
        });

    } catch (err: any) {
        return next(new HttpException(500, err.message, "Fire Detection"));
    }
});



//route for get face recognication list  
router.post("/face", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

        //get body from request
        const { camera_id, time, date_start, date_end, personnel_id } = req.body;
        if (!camera_id || !time || !date_start || !date_end || !personnel_id) {
            req.flash("error", "Please fill all fields");
            return next(new HttpException(400, "Bad Request", "Face Recognication"));
        }
        //convert date_start to epokh
        let timeStartScientificSymbol = date2Epokh(date_start, time);
        let timeEndScientificSymbol = date2Epokh(date_end, time);

        //get personnel with personnel_id from DB
        const personnel = await Personnel.findOne({ _id: personnel_id }).exec();

        //get data from elastic
        const response = await axios.get(dbUri + '/face/_search', {
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

        //check if isAllowed is true or false and create return data to client
        let facesRecognition = response.data.hits.hits.map((item: any) => {
            return {
                id: item._id,
                camera_id: item._source.properties.camera_id,
                timestamp: item._source.properties.timestamp,
                fullname: personnel?.first_name + " " + personnel?.last_name,
                isAllowed: personnel?.camera_whitelist?.includes(item._source.properties.camera_id)
            }
        });

        //return data to client
        return res.status(200).json({
            message: "Success",
            report: facesRecognition
        });

    } catch (err: any) {
        return next(new HttpException(500, err.message, "Face Recognication"));
    }
});


//route for get people counting list  
router.post("/human", async function (req: Request, res: Response, next: NextFunction) {
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
            return next(new HttpException(400, "Bad Request", "People Counting"));
        }
        //convert date_start to epokh
        let timeStartScientificSymbol = date2Epokh(date_start, time);
        let timeEndScientificSymbol = date2Epokh(date_end, time);

        //get data from elastic
        const response = await axios.get(dbUri + '/human/_search', {
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
        return next(new HttpException(500, err.message, "People Counting"));
    }
});




//route for get plate list  
router.post("/plate", async function (req: Request, res: Response, next: NextFunction) {
    try {
        //get page from url
        let strPage = req.query.page as string;
        let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        //get perPage from url
        let strPerPage = req.query.perPage as string;
        let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;

        //get body from request
        const { camera_id, time, date_start, date_end, owner, car, color } = req.body;
        if (!camera_id || !time || !date_start || !date_end || !owner) {
            req.flash("error", "Please fill all fields");
            return next(new HttpException(400, "Bad Request", "Plate License"));
        }
        let carDB = await Car.findOne({ owner: owner }).exec();
        if (!carDB) {
            req.flash("error", "Owner not found");
            return next(new HttpException(400, "Car Not Found", "Plate License"));
        }

        let model2camera = await modelToCamera.findOne({ camera_id: camera_id }).exec();
        if (!model2camera) {
            req.flash("error", "Camera not found");
            return next(new HttpException(400, "Camera Not Found", "Plate License"));
        }

        //convert date_start to epokh
        let timeStartScientificSymbol = date2Epokh(date_start, time);
        let timeEndScientificSymbol = date2Epokh(date_end, time);

        //get data from elastic
        const response = await axios.get(dbUri + '/plate/_search', {
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
                                    'properties.plate_number': car.number_plate
                                }
                            },
                            {
                                'term': {
                                    'properties.m2c_id': model2camera._id
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

        //create return data to client
        let plates = response.data.hits.hits.map((item: any) => {
            return {
                id: item._id,
                timestamp: item._source.properties.timestamp,
                plate_number: item._source.properties.plate_number,
                car: car,
                color: color,
                isAllowed: carDB?.camera_whitelist?.includes(item._source.properties.camera_id)
            }
        });

        //return data to client
        return res.status(200).json({
            message: "Success",
            report: response.data
        });

    } catch (err: any) {
        return next(new HttpException(500, err.message, "Plate License"));
    }
});

export default router;
import { Router, Request, Response, NextFunction, query } from "express";
import HttpException from "../../error/HttpException";
import { getTokenAndVerify } from "../../tools/authentication";
import Mock from "@elastic/elasticsearch-mock";
import { Client } from "@elastic/elasticsearch";
import axios from "axios";
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


//route for get sections list  
router.get("", async function (req: Request, res: Response, next: NextFunction) {
    try {

        const mock = new Mock();
        // //get page from url
        // let strPage = req.query.page as string;
        // let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
        // //get perPage from url
        // let strPerPage = req.query.perPage as string;
        // let perPage = parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
        // let search = req.query.search as string || "";
        //query for get report elastic search

        const response = await axios.get('http://services.ariapa.com:9200/face_logs/_search', {
            headers: {
                'Content-Type': 'application/json'
            },
            // data: '\n{\n  "from": 2,\n  "size": 5,\n  "query": {\n    "range": {\n      "properties.confidence": {\n        "gte": 0.7\n      }\n    }\n  }\n}',
            data: {
                'from': 2,
                'size': 5,
                'query': {
                    'range': {
                        'properties.confidence': {
                            'gte': 0.7
                        }
                    }
                }
            }
        });

        return res.status(200).json({
            message: "Success",
            report: response.data
        });

    } catch (err: any) {
        return next(new HttpException(500, err.message, "section"));
    }
});

export default router;
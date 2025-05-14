import { Router, Request, Response, NextFunction } from 'express';
import { ApiError } from '../../types/classes/error.class';
import Model from '../../db/mongo/models/model';
import { readMiddleware } from '../../db/mongo/read.database';

//create router for add to server file
const router: Router = Router();

//create route for get list of models
router.get('', readMiddleware(Model));
//, {searchFromParams: (params) => params.category}

//route for get model by category from DB
router.get(
	'/:category',
	readMiddleware(
		Model,
		(search) => {
			return { category: { $regex: search, $options: 'i' } };
		},
		{ searchFromParams: (params) => params.category }
	)
);

export default router;

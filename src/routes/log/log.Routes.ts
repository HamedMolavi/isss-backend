import { Log } from '../../db/mongo/models/secLog';
import { Router } from 'express';
import { readByIdMiddleware, readMiddleware } from '../../db/mongo/read.database';

//create router for add to server file
const router: Router = Router();

//route for get log list with message search and sorting
router.get(
	'',
	readMiddleware(
		Log,
		(search) => {
			if (!search) return {};

			const searchRegex = { $regex: search, $options: 'i' };
			const isBoolean = search.toLowerCase() === 'true' || search.toLowerCase() === 'false';

			return {
				$or: [
					{ error: searchRegex },
					{ message: searchRegex },
					{ 'metadata.username': searchRegex },
					{ 'metadata.userid': searchRegex },
					{ 'metadata.ip': searchRegex },
					...(isBoolean ? [{ 'metadata.success': search.toLowerCase() === 'true' }] : [])
				]
			};
		},
		{
			populate: true,
			defaultSort: { createdAt: -1 }
		}
	)
);

//route for get car_brand by id from DB
router.get('/:id', readByIdMiddleware(Log));

export default router;

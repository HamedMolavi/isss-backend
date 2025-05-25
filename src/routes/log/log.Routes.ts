import { Router } from 'express';
import { Log } from '../../db/mongo/models/secLog';
import { readByIdMiddleware, readMiddleware } from '../../db/mongo/read.database';
import * as LogController from '../../controllers/log.controller';

const LogRouter: Router = Router();

const route_prefix = '';

// Route for get log list with message search and sorting
LogRouter.get(
	`${route_prefix}`,
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
			defaultSort: { created_at: -1 }
		}
	)
);

// Route for get log by id from DB
LogRouter.get(`${route_prefix}/:id`, readByIdMiddleware(Log));

// Route for checking log status
LogRouter.get(`${route_prefix}/monitor/status`, LogController.getMonitorStatus);

// Route for getting logs grouped by messages
LogRouter.get(`${route_prefix}/group/messages`, LogController.getGroupedMessages);

export default LogRouter;

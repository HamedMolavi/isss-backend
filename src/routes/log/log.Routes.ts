import { Router } from 'express';
import { Log } from '../../db/mongo/models/secLog';
import { readMiddleware } from '../../db/mongo/read.database';
import * as LogController from '../../controllers/log.controller';
import { accessCheck } from '../../authentication/accessCheck.auth';
import LogIntegrityRouter from './logIntegrity.routes';

const LogRouter: Router = Router();

const route_prefix = '';

// Include integrity routes
LogRouter.use(LogIntegrityRouter);

// Route for get log list with message search and sorting
LogRouter.get(
	`${route_prefix}`,
	accessCheck('logs'),
	readMiddleware(
		Log,
		(search) => {
			if (!search) return {};

			// Escape special regex characters to prevent regex issues
			const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
			const searchRegex = { $regex: escapeRegex(search), $options: 'i' };
			const isBoolean = search.toLowerCase() === 'true' || search.toLowerCase() === 'false';

			return {
				$or: [
					{ message: searchRegex },
					{ 'metadata.username': searchRegex },
					{ 'metadata.userid': searchRegex },
					{ 'metadata.ip': searchRegex },
					{ 'metadata.type': searchRegex },
					...(isBoolean ? [{ 'metadata.success': search.toLowerCase() === 'true' }] : []),
					{ level: searchRegex }
				]
			};
		},
		{
			populate: true,
			defaultSort: { created_at: -1 },
			defaultQuery: (queryParams) => {
				const query = {} as {
					action?: string;
					level?: string;
					created_at?: {
						$gte?: Date;
						$lte?: Date;
					};
					'metadata.username'?: {
						$exists: boolean;
						$nin?: string[];
					};
				};

				// Filter out logs where username is not available or is system/unknown
				query['metadata.username'] = {
					$exists: true,
					$nin: ['system', 'unknown']
				};

				// Filter by action if provided
				if (queryParams.action) {
					query.action = queryParams.action;
				}

				// Filter by level if provided
				if (queryParams.level) {
					query.level = queryParams.level;
				}

				// Filter by date range if provided
				if (queryParams.startDate || queryParams.endDate) {
					query.created_at = {};
					if (queryParams.startDate) {
						query.created_at.$gte = new Date(queryParams.startDate);
					}
					if (queryParams.endDate) {
						query.created_at.$lte = new Date(queryParams.endDate);
					}
				}

				return query;
			}
		}
	)
);

// Route for get log by id from DB
LogRouter.get(`${route_prefix}/:id/info`, accessCheck('logs'), async (req, res) => {
	try {
		const id = req.params.id;

		// Query with username filtering
		const doc = await Log.findOne({
			_id: id,
			'metadata.username': {
				$exists: true,
				$nin: ['system', 'unknown']
			}
		}).exec();

		if (!doc) {
			return res.status(404).json({
				success: false,
				message: 'Log not found or not accessible'
			});
		}

		return res.status(200).json({
			success: true,
			data: doc.toJSON()
		});
	} catch (err: unknown) {
		if (err && typeof err === 'object' && 'kind' in err && err.kind === 'ObjectId') {
			return res.status(400).json({
				success: false,
				message: `Invalid log ID: ${req.params.id}`
			});
		}
		return res.status(500).json({
			success: false,
			message: 'Internal server error: ' + (err instanceof Error ? err.message : 'Unknown error')
		});
	}
});

// Route for checking log status
LogRouter.get(`${route_prefix}/monitor/status`, accessCheck('systemLog'), LogController.getMonitorStatus);

// Route for getting logs grouped by actions
LogRouter.get(`${route_prefix}/group/actions`, accessCheck('logs'), LogController.getGroupedActions);

export default LogRouter;

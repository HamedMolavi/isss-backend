import { Log } from '../../db/mongo/models/secLog';
import { Router } from 'express';
import { readByIdMiddleware, readMiddleware } from '../../db/mongo/read.database';
import { checkLogStatus } from '../../tools/logMonitor.tools';

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

//route for checking log status
router.get('/monitor/status', async (req, res) => {
	try {
		const stats = await checkLogStatus(req);
		res.status(200).json({
			message: 'Log status check completed',
			data: stats
		});
	} catch (error) {
		console.error('Error checking log status:', error);
		res.status(500).json({ error: 'Failed to check log status' });
	}
});

//route for getting logs grouped by messages
router.get('/group/messages', async (req, res) => {
	try {
		const messageGroups = await Log.aggregate([
			{
				$group: {
					_id: '$message'
				}
			}
		]);

		res.status(200).json({
			success: true,
			data: messageGroups
		});
	} catch (error: unknown) {
		const err = error as Error;
		res.status(500).json({
			success: false,
			error: err.message
		});
	}
});

export default router;

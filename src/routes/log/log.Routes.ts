import { Router } from 'express';
import * as LogController from '../../controllers/log.controller';
import { accessCheck } from '../../authentication/accessCheck.auth';
import LogIntegrityRouter from './logIntegrity.routes';

const LogRouter: Router = Router();

const route_prefix = '';

// Include integrity routes
LogRouter.use(LogIntegrityRouter);

// Allowed sort fields for log queries
const ALLOWED_SORT_FIELDS = [
	'created_at',
	'timestamp',
	'level',
	'action',
	'metadata.ip',
	'metadata.username',
	'metadata.type',
	'metadata.success',
	'message'
];

// Main route for getting logs with filtering, sorting, searching and formatting
// GET /api/v1/logs?page=1&limit=20&search=admin&action=login_success&format=readable
// Query params:
// - page, limit: Pagination
// - search: Search across multiple fields
// - sortBy, sortOrder: Sorting (e.g., sortBy=timestamp&sortOrder=desc)
// - action, level, category: Filters
// - username, ip: User filters
// - startDate, endDate: Date range
// - success: Filter by success status (true/false)
// - format: 'readable' for human-readable format, 'raw' for raw data (default: readable)
// - showHttpLogs: Show/hide HTTP request logs (default: true)
// - httpMethod: Filter by HTTP method (GET,POST,PUT,DELETE)
// - onlyHttpLogs: Show only HTTP request logs (default: false)
LogRouter.get(`${route_prefix}`, accessCheck('logs'), LogController.getLogs);

// Route to get available sort fields
LogRouter.get(`${route_prefix}/sort-options`, accessCheck('logs'), (req, res) => {
	return res.status(200).json({
		success: true,
		data: {
			sortFields: ALLOWED_SORT_FIELDS.map((field) => ({
				value: field,
				label: field
					.replace('metadata.', '')
					.replace('_', ' ')
					.replace(/\b\w/g, (c) => c.toUpperCase())
			})),
			sortOrders: [
				{ value: 'asc', label: 'Ascending' },
				{ value: 'desc', label: 'Descending' }
			]
		}
	});
});

// ==========================================
// LOG HELPER ENDPOINTS
// ==========================================

// Route for getting filter options (actions, categories, levels, etc.)
// GET /api/v1/logs/filter-options
LogRouter.get(`${route_prefix}/filter-options`, accessCheck('logs'), LogController.getFilterOptions);

// Route for getting log statistics
// GET /api/v1/logs/stats?startDate=2024-01-01&endDate=2024-12-31
LogRouter.get(`${route_prefix}/stats`, accessCheck('logs'), LogController.getLogStats);

// ==========================================

// Route for get log by id from DB
LogRouter.get(`${route_prefix}/:id/info`, accessCheck('logs'), LogController.getLogById);

// Route for checking log status
LogRouter.get(`${route_prefix}/monitor/status`, accessCheck('systemLog'), LogController.getMonitorStatus);

// Route for getting logs grouped by actions
LogRouter.get(`${route_prefix}/group/actions`, accessCheck('logs'), LogController.getGroupedActions);

// Route for getting logged-in user's own logs
// GET /api/v1/logs/my-logs?page=1&limit=20&action=login_success&format=readable
// Any authenticated user can view their own logs
LogRouter.get(`${route_prefix}/my-logs`, LogController.getMyLogs);

export default LogRouter;

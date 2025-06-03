import { Request, Response, NextFunction } from 'express';
import { LogIntegrityService } from '../services/logIntegrity.service';
import { Logger } from '../logger';

/**
 * Middleware to verify log integrity when reading logs
 * This middleware runs hash verification for the last 1000 logs in background
 */
export const verifyLogIntegrityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
	if (req.method !== 'GET') {
		next();
	}

	// Check if this is a log reading operation
	const pathSegments = req.path.split('/');
	const isLogReadOperation = pathSegments.some(
		(segment) => segment.includes('log') || segment.includes('logs')
	);

	if (!isLogReadOperation) {
		next();
	}

	// Always let the request continue immediately
	next();

	// Run integrity verification in background (non-blocking)
	setImmediate(async () => {
		try {
			// Only run verification for GET requests to log endpoints

			// Get verification count from query parameter or default to 1000
			const verificationCount = parseInt(req.query.verifyCount as string) || 1000;

			// Skip verification if explicitly disabled
			if (req.query.skipIntegrityCheck === 'true' || req.query.skipIntegrityCheck === '1') {
				Logger.systemOperation('Log integrity verification skipped', {
					action: 'LOG_INTEGRITY_VERIFICATION_SKIPPED',
					userId: req.user?._id?.toString(),
					path: req.path
				});
				return;
			}

			Logger.systemOperation('Starting background log integrity verification', {
				action: 'BACKGROUND_LOG_INTEGRITY_VERIFICATION_START',
				userId: req.user?._id?.toString(),
				path: req.path,
				verificationCount
			});

			// Run integrity verification in background
			const integrityService = LogIntegrityService.getInstance();

			const result = await integrityService.verifyRecentLogsIntegrity(verificationCount);

			Logger.systemOperation('Background log integrity verification completed', {
				action: 'BACKGROUND_LOG_INTEGRITY_VERIFICATION_COMPLETED',
				userId: req.user?._id?.toString(),
				path: req.path,
				result
			});

			// If there are integrity violations, they will be sent to Kafka automatically
			if (result.invalidLogs > 0 || result.missingHashes > 0) {
				Logger.warn('Log integrity violations detected in background check', {
					action: 'BACKGROUND_LOG_INTEGRITY_VIOLATIONS_DETECTED',
					userId: req.user?._id?.toString(),
					path: req.path,
					invalidLogs: result.invalidLogs,
					missingHashes: result.missingHashes,
					invalidLogIds: result.invalidLogIds
				});
			} else {
				Logger.info('No integrity violations found', {
					action: 'BACKGROUND_LOG_INTEGRITY_VERIFICATION_NO_VIOLATIONS',
					userId: req.user?._id?.toString(),
					path: req.path
				});
			}
		} catch (error) {
			Logger.error('Background log integrity verification error', {
				action: 'BACKGROUND_LOG_INTEGRITY_VERIFICATION_ERROR',
				userId: req.user?._id?.toString(),
				path: req.path,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	});
};

/**
 * Middleware to add integrity verification results to response headers
 */
export const addIntegrityHeadersMiddleware = (req: Request, res: Response, next: NextFunction): void => {
	// Store original json method
	const originalJson = res.json;

	// Override json method to add integrity headers
	res.json = function (body: Record<string, unknown>) {
		// Add integrity verification timestamp
		res.setHeader('X-Log-Integrity-Check', new Date().toISOString());
		res.setHeader('X-Log-Integrity-Service', 'active');

		// Call original json method
		return originalJson.call(this, body);
	};

	// Add headers for non-JSON responses too
	res.setHeader('X-Log-Integrity-Check', new Date().toISOString());
	res.setHeader('X-Log-Integrity-Service', 'active');

	next();
};

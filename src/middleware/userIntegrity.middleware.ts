import { Request, Response, NextFunction } from 'express';
import { UserIntegrityService } from '../services/userIntegrity.service';
import { Logger } from '../logger';

/**
 * Middleware to verify user integrity when accessing user-related routes
 * This middleware runs username integrity verification in background for user operations
 */
export const verifyUserIntegrityMiddleware = (req: Request, res: Response, next: NextFunction): void => {
	// Check if this is a user-related operation
	const pathSegments = req.path.split('/');
	const isUserOperation =
		pathSegments.some(
			(segment) =>
				segment.includes('user') ||
				segment.includes('users') ||
				segment.includes('personnel') ||
				segment.includes('admin')
		) ||
		req.path.includes('/user') ||
		req.path.includes('/users') ||
		req.path.includes('/personnel') ||
		req.path.includes('/admin');

	// Only run on user-related routes
	if (!isUserOperation) {
		return next();
	}

	// Always let the request continue immediately for user routes
	next();

	// Run integrity verification in background (non-blocking) only for user operations
	setImmediate(async () => {
		try {
			// Get verification count from query parameter or default to 100 for users
			const verificationCount = parseInt(req.query.userVerifyCount as string) || 100;

			// Skip verification if explicitly disabled
			if (req.query.skipUserIntegrityCheck === 'true' || req.query.skipUserIntegrityCheck === '1') {
				Logger.systemOperation('User integrity verification skipped', {
					action: 'USER_INTEGRITY_VERIFICATION_SKIPPED',
					userId: req.user?._id?.toString(),
					path: req.path
				});
				return;
			}

			// Only run verification for GET requests to avoid performance impact on write operations
			if (req.method !== 'GET') {
				return;
			}

			Logger.systemOperation('Starting background user integrity verification', {
				action: 'BACKGROUND_USER_INTEGRITY_VERIFICATION_START',
				userId: req.user?._id?.toString(),
				path: req.path,
				verificationCount
			});

			// Run integrity verification in background
			const integrityService = UserIntegrityService.getInstance();

			const result = await integrityService.verifyUsernamesIntegrity(verificationCount);

			Logger.systemOperation('Background user integrity verification completed', {
				action: 'BACKGROUND_USER_INTEGRITY_VERIFICATION_COMPLETED',
				userId: req.user?._id?.toString(),
				path: req.path,
				result
			});

			// If there are integrity violations, they will be sent to Kafka automatically
			if (result.invalidUsers > 0 || result.missingHashes > 0) {
				Logger.warn('User integrity violations detected in background check', {
					action: 'BACKGROUND_USER_INTEGRITY_VIOLATIONS_DETECTED',
					userId: req.user?._id?.toString(),
					path: req.path,
					invalidUsers: result.invalidUsers,
					missingHashes: result.missingHashes,
					invalidUserIds: result.invalidUserIds
				});
			} else {
				Logger.info('No user integrity violations found', {
					action: 'BACKGROUND_USER_INTEGRITY_VERIFICATION_NO_VIOLATIONS',
					userId: req.user?._id?.toString(),
					path: req.path
				});
			}
		} catch (error) {
			Logger.error('Background user integrity verification error', {
				action: 'BACKGROUND_USER_INTEGRITY_VERIFICATION_ERROR',
				userId: req.user?._id?.toString(),
				path: req.path,
				error: error instanceof Error ? error.message : 'Unknown error'
			});
		}
	});
};

import { Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { ApiRes } from '../utils/api.response';
import { HttpStatus } from '../types/http_status';
import { SecurityLogger } from '../logger/security.logger';

interface GuardOptions {
	idParam?: string;
	entityName?: string;
	allowPaths?: string[];
}

/**
 * Blocks and logs operations on inactive entities (is_active === false).
 * Use for routes with :id parameters where inactive targets must be rejected.
 */
export function rejectInactiveEntity<T extends { is_active?: boolean }>(
	model: Model<T>,
	options: GuardOptions = {}
) {
	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			const idParam = options.idParam ?? 'id';
			const targetId = req.params[idParam];

			// Skip if no id or path is explicitly allowed (e.g., activate)
			if (!targetId || options.allowPaths?.some((p) => req.path.includes(p))) {
				return next();
			}

			const target = await model.findById(targetId).select('is_active username name').lean();
			if (!target) return next();

			if (target.is_active === false) {
				SecurityLogger.suspiciousActivity(req, 'inactive_entity_access', {
					entity: options.entityName ?? model.modelName,
					entityId: targetId,
					path: req.originalUrl
				});

				return ApiRes(res, {
					status: HttpStatus.FORBIDDEN,
					msg: 'Target entity is inactive'
				});
			}

			return next();
		} catch (error) {
			SecurityLogger.suspiciousActivity(req, 'inactive_entity_guard_error', {
				entity: options.entityName ?? model.modelName,
				entityId: req.params[options.idParam ?? 'id'],
				error: error instanceof Error ? error.message : 'unknown_error'
			});
			// Fail-open to avoid blocking due to guard failure
			return next();
		}
	};
}

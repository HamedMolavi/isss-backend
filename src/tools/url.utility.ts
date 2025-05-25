import { Request } from 'express';

/**
 * Checks if a path segment is likely an ID rather than a resource name
 */
export function isLikelyId(segment: string): boolean {
	return (
		// UUID pattern
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment) ||
		// MongoDB ObjectId pattern
		/^[0-9a-f]{24}$/i.test(segment) ||
		// Numeric ID
		/^\d+$/.test(segment)
	);
}

/**
 * Generates a descriptive action string based on URL path structure
 * @param req Express request object
 * @returns A descriptive action string for logging
 */
export function generateActionString(req: Request): string {
	// Get the operation based on HTTP method
	const operation =
		req.method === 'POST'
			? 'create'
			: req.method === 'PUT'
				? 'update'
				: req.method === 'DELETE'
					? 'delete'
					: req.method === 'GET'
						? 'read'
						: req.method === 'PATCH'
							? 'partial_update'
							: 'execute';

	// Extract path without query parameters
	const url = req.originalUrl || req.url;
	const path = url.split('?')[0];

	// Split path into segments and remove empty ones
	let segments = path.split('/').filter(Boolean);

	// Remove API version prefix if present (api/v1, api/v2, etc.)
	if (segments.length >= 2 && segments[0] === 'api' && segments[1].startsWith('v')) {
		segments = segments.slice(2);
	}

	// Handle empty path after removing prefix
	if (segments.length === 0) {
		return `${operation}_root`;
	}

	// Extract resource and sub-resource
	const resource = segments[0];

	// Handle auth endpoints with special format
	if (resource === 'auth' && segments.length > 1) {
		return `${resource}_${segments[1]}`;
	}

	// Singularize resource name for better action naming - general rule
	let singularResource = resource;
	if (resource.endsWith('s')) {
		singularResource = resource.endsWith('ies')
			? resource.slice(0, -3) + 'y' // Handles plurals like "categories" → "category"
			: resource.slice(0, -1); // Handles regular plurals like "users" → "user"
	}

	// Build the action string
	let action = '';

	// Add operation prefix except for auth endpoints
	if (resource !== 'auth') {
		action += `${operation}_`;
	}

	// Add resource name
	action += singularResource;

	// Add sub-resources if present
	if (segments.length > 1 && !isLikelyId(segments[1])) {
		action += `_${segments[1]}`;

		// Add additional sub-resources if present
		if (segments.length > 2 && !isLikelyId(segments[2])) {
			action += `_${segments[2]}`;
		}
	}

	return action;
}

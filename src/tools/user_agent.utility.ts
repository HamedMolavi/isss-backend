import { Request } from 'express';
import { parse } from 'platform';
import { getClientIP } from './util.tools';

const MAX_USER_AGENT_LENGTH = 512;

export function sanitizeUserAgent(value: unknown): string {
	const rawValue = Array.isArray(value) ? value.join(' ') : value;
	if (typeof rawValue !== 'string') {
		return 'unknown';
	}

	const sanitized = rawValue
		.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();

	if (!sanitized) {
		return 'unknown';
	}

	return sanitized.slice(0, MAX_USER_AGENT_LENGTH);
}

/**
 * Retrieves information about the user agent from the request object
 * @param req - The request object containing the user agent information in the headers
 */
export const get_user_agent = (req: Request) => {
	const userAgent = sanitizeUserAgent(req.headers['user-agent']);
	const info = parse(userAgent);
	// Use centralized IP extraction for consistency
	const ip = getClientIP(req);

	return {
		ip: ip || 'N/A',
		browser: info?.name,
		description: info?.description,
		user_agent: userAgent,
		api_version: req.headers['version'],
		api_key: req.headers['x-api-key'],
		api_agent: req.headers['agent'],
		api_platform: (req.headers['platform'] as string) || '',
		os: `${info?.os?.family ?? 'N/A'} ${info?.os?.architecture ?? 'N/A'} ${info?.os?.version ?? 'N/A'}`,
		info: info
	};
};

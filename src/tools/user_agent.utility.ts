import { Request } from 'express';
import { parse } from 'platform';

/**
 * Retrieves information about the user agent from the request object
 * @param req - The request object containing the user agent information in the headers
 */
export const get_user_agent = (req: Request) => {
	const info = parse(req.headers['user-agent']);
	const remoteAddress = req.ip || req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'N/A';

	return {
		ip: remoteAddress,
		browser: info?.name,
		description: info?.description,
		user_agent: req.headers['user-agent'],
		api_version: req.headers['version'],
		api_key: req.headers['x-api-key'],
		api_agent: req.headers['agent'],
		api_platform: (req.headers['platform'] as string) || '',
		os: `${info?.os?.family ?? 'N/A'} ${info?.os?.architecture ?? 'N/A'} ${info?.os?.version ?? 'N/A'}`,
		info: info
	};
};

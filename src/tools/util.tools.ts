export function log(...args: any) {
	if (process.env['NODE_ENV'] === 'development') console.log(...args);
	return;
}

//for create new guid
export class Guid {
	static newGuid() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = (Math.random() * 16) | 0,
				v = c == 'x' ? r : (r & 0x3) | 0x8;
			return v.toString(16);
		});
	}
}

export function generateRandomString(length: number) {
	const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += characters.charAt(Math.floor(Math.random() * characters.length));
	}
	return result;
}

/**
 * Formats and validates IP address to IPv4 format
 * @param ip - Input IP address (can be IPv6, IPv4, or mixed format)
 * @returns IPv4 address string or null if invalid
 */
export const formatToIPv4 = (ip: string): string | null => {
	if (!ip) return null;

	// Clean the input
	let cleaned = ip.trim();

	// Remove IPv6 mapped prefix variations (::ffff:, ::FFFF:, etc.)
	// This handles formats like "::ffff:192.168.1.1" or "::FFFF:192.168.1.1"
	cleaned = cleaned.replace(/^::ffff:/i, '');

	// If it's already IPv4, validate and return
	const ipv4Regex = /^(?:\d{1,3}\.){3}\d{1,3}$/;
	if (ipv4Regex.test(cleaned)) {
		// Additional validation for valid IPv4 ranges (0-255)
		const parts = cleaned.split('.');
		for (const part of parts) {
			const num = parseInt(part, 10);
			if (num > 255) return null;
		}
		return cleaned;
	}

	// If no valid IPv4 found, return null
	return null;
};

/**
 * Extracts the client IP address from the request consistently
 * Handles x-forwarded-for, x-real-ip, and direct IP
 * @param req - The Express request object (or similar with headers and ip properties)
 * @returns The formatted IPv4 address or empty string if not found
 */
export const getClientIP = (req: {
	headers: Record<string, string | string[] | undefined>;
	ip?: string;
	socket?: { remoteAddress?: string };
}): string => {
	let rawIP: string | undefined;

	// Priority: x-real-ip > x-forwarded-for (first IP) > req.ip > socket.remoteAddress
	const xRealIP = req.headers['x-real-ip'];
	if (xRealIP) {
		rawIP = Array.isArray(xRealIP) ? xRealIP[0] : xRealIP;
	}

	if (!rawIP) {
		const xForwardedFor = req.headers['x-forwarded-for'];
		if (xForwardedFor) {
			// x-forwarded-for can be a comma-separated string or array
			if (Array.isArray(xForwardedFor)) {
				rawIP = xForwardedFor[0];
			} else {
				// Get the first IP from comma-separated list (original client IP)
				rawIP = xForwardedFor.split(',')[0]?.trim();
			}
		}
	}

	if (!rawIP) {
		rawIP = req.ip || req.socket?.remoteAddress;
	}

	if (!rawIP) {
		return '';
	}

	// Format to IPv4
	const formattedIP = formatToIPv4(rawIP);
	return formattedIP || '';
};

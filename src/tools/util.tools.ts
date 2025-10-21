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
	const cleaned = ip.trim();

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

	// Try to extract IPv4 from IPv6 mapped format (::ffff:192.168.1.1)
	const ipv6MappedRegex = /::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/i;
	const mapped = cleaned.match(ipv6MappedRegex);
	if (mapped && mapped[1]) {
		const parts = mapped[1].split('.');
		let valid = true;
		for (const part of parts) {
			const num = parseInt(part, 10);
			if (num > 255) {
				valid = false;
				break;
			}
		}
		if (valid) return mapped[1];
	}

	// If no valid IPv4 found, return null
	return null;
};

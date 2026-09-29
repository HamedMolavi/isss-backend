import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

const RTSP_PROTOCOLS = new Set(['rtsp:', 'rtsps:']);
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f-\u009f]/;

export function isValidRtspUrl(value: unknown): boolean {
	if (typeof value !== 'string') return false;

	const url = value.trim();
	if (!url || url.length > 2048 || CONTROL_CHARACTERS.test(url) || /\s/.test(url)) {
		return false;
	}

	try {
		const parsedUrl = new URL(url);
		return RTSP_PROTOCOLS.has(parsedUrl.protocol) && Boolean(parsedUrl.hostname);
	} catch {
		return false;
	}
}

@ValidatorConstraint({ name: 'isRtspUrl', async: false })
export class IsRtspUrl implements ValidatorConstraintInterface {
	validate(value: unknown): boolean {
		return value === undefined || value === null || isValidRtspUrl(value);
	}

	defaultMessage(args: ValidationArguments): string {
		return `${args.property} must be a valid RTSP or RTSPS URL.`;
	}
}

import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { DIGITS } from '../tools/plate.tools';

const INVISIBLE_CHARS_REGEX = /[\u200b-\u200f\uFEFF]/g;

export function normalizePersonnelText(value: unknown): unknown {
	if (typeof value !== 'string') return value;

	return value.replace(INVISIBLE_CHARS_REGEX, ' ').replace(/\s+/g, ' ').trim();
}

export function normalizeNumericText(value: unknown): unknown {
	const normalized = normalizePersonnelText(value);
	if (typeof normalized !== 'string') return normalized;

	return normalized
		.split('')
		.map((char) => DIGITS[char] ?? char)
		.join('');
}

@ValidatorConstraint({ name: 'isNonBlankText', async: false })
export class IsNonBlankText implements ValidatorConstraintInterface {
	validate(value: unknown): boolean {
		return typeof normalizePersonnelText(value) === 'string' && (normalizePersonnelText(value) as string).length > 0;
	}

	defaultMessage(args: ValidationArguments): string {
		return `${args.property} cannot be empty`;
	}
}

@ValidatorConstraint({ name: 'isNumericText', async: false })
export class IsNumericText implements ValidatorConstraintInterface {
	validate(value: unknown): boolean {
		const normalized = normalizeNumericText(value);
		return typeof normalized === 'string' && /^[0-9]+$/.test(normalized);
	}

	defaultMessage(args: ValidationArguments): string {
		return `${args.property} must contain only numbers`;
	}
}

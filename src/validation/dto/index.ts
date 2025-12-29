import {
	ValidatorConstraint,
	ValidatorConstraintInterface,
	ValidationArguments,
	ValidationOptions,
	ValidateIf
} from 'class-validator';
import Time from '../../tools/time.tools';
import { RequestHandler, Request, Response, NextFunction } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate, ValidationError } from 'class-validator';
import path from 'path';
import { existsSync } from 'fs';
import mongoose from 'mongoose';
import { count, Pipeline } from '../../db/mongo/count.database';
import { ApiRes } from '../../utils/api.response';
import { HttpStatus } from '../../types/http_status';

interface DtoValidationOptions {
	skipMissingProperties?: boolean;
	detailedMassage?: boolean;
	info?: string;
}

/**
 * Extract validation error messages from ValidationError array
 */
function extractValidationErrors(errors: ValidationError[]): string[] {
	const messages: string[] = [];

	for (const error of errors) {
		if (error.constraints) {
			messages.push(...Object.values(error.constraints));
		}
		// Handle nested validation errors
		if (error.children && error.children.length > 0) {
			messages.push(...extractValidationErrors(error.children));
		}
	}

	return messages;
}

/**
 * DTO Validation Middleware
 *
 * Validates request body against a DTO class using class-validator.
 * Returns proper JSON response with appropriate HTTP status codes.
 */
export function dtoValidationMiddleware(
	type: new () => object,
	options?: DtoValidationOptions
): RequestHandler {
	const defaultOptions: DtoValidationOptions = {
		skipMissingProperties: false,
		detailedMassage: process.env['NODE_ENV'] === 'development',
		info: undefined
	};

	const mergedOptions = { ...defaultOptions, ...options };

	return async (req: Request, res: Response, next: NextFunction) => {
		try {
			// Transform plain object to DTO instance
			const dtoInstance = plainToInstance(type, req.body);

			// Validate the DTO instance
			const errors = await validate(dtoInstance as object, {
				skipMissingProperties: mergedOptions.skipMissingProperties
			});

			if (errors.length > 0) {
				const errorMessages = extractValidationErrors(errors);
				const errorMessage = mergedOptions.detailedMassage
					? errorMessages.join(', ')
					: mergedOptions.info || 'Validation failed';

				return ApiRes(res, {
					status: HttpStatus.BAD_REQUEST,
					msg: errorMessage
				});
			}

			// Validation passed, proceed to next middleware
			next();
		} catch {
			return ApiRes(res, {
				status: HttpStatus.BAD_REQUEST,
				msg: 'Validation error occurred'
			});
		}
	};
}

/*
{
    * Validating value.
  value: any;
    * Constraints set by this validation type.
  constraints: any[];
    * Name of the target that is being validated.
  targetName: string;
    * Object that is being validated.
  object: object;
    * Name of the object's property being validated.
  property: string;
}
*/

@ValidatorConstraint({ name: 'isImageString', async: false })
export class IsImageString implements ValidatorConstraintInterface {
	validate(image_str: unknown): boolean {
		if (typeof image_str !== 'string') return false;

		const jpegPrefix = 'data:image/jpeg;base64,';
		const pngPrefix = 'data:image/png;base64,';

		let processedStr = image_str;
		if (processedStr.startsWith(jpegPrefix)) {
			processedStr = processedStr.substring(jpegPrefix.length);
		} else if (processedStr.startsWith(pngPrefix)) {
			processedStr = processedStr.substring(pngPrefix.length);
		}

		const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
		return processedStr.length > 0 && (processedStr.length > 1024 * 1024 || base64Regex.test(processedStr));
	}

	defaultMessage(args: ValidationArguments): string {
		return `${args.property} should be a valid JPG or PNG image encoded with base64.`;
	}
}

interface DateTimeObject {
	[key: string]: unknown;
}

@ValidatorConstraint({ name: 'timeAndDate', async: false })
export class TimeAndDateValidator implements ValidatorConstraintInterface {
	validate(time: string, args: ValidationArguments): boolean {
		const obj = args.object as DateTimeObject;
		const dateField = args.constraints[0] as string;
		const date = obj[dateField];
		return Boolean(time && date);
	}

	defaultMessage(): string {
		return 'Both time and date must be present.';
	}
}

interface DateRangeObject {
	date_start?: string;
	date_end?: string;
	time_start?: string;
	time_end?: string;
}

@ValidatorConstraint({ name: 'endgtrStart', async: false })
export class EndgtrStartValidator implements ValidatorConstraintInterface {
	validate(_value: unknown, args: ValidationArguments): boolean {
		const obj = args.object as DateRangeObject;
		if (obj.date_start && obj.date_end) {
			const timezone = Time.getUtcOffset(process.env.TZ ?? 'Asia/Tehran');
			const start = new Date(`${obj.date_start} ${obj.time_start || ''}${timezone}`).getTime();
			const end = new Date(`${obj.date_end} ${obj.time_end || ''}${timezone}`).getTime();
			return end >= start;
		}
		return true;
	}

	defaultMessage(): string {
		return 'End time must be greater than start time.';
	}
}

type ComparisonOperator = 'gt' | 'gte' | 'ls' | 'lse';

interface ComparisonObject {
	[key: string]: unknown;
}

@ValidatorConstraint({ name: 'comparison', async: false })
export class Comparison implements ValidatorConstraintInterface {
	validate(_value: unknown, args: ValidationArguments): boolean {
		const obj = args.object as ComparisonObject;
		const propertyValue = obj[args.property];

		if (typeof propertyValue !== 'number') return false;

		const [operator, compareValue] = args.constraints as [ComparisonOperator, number];

		switch (operator) {
			case 'gt':
				return propertyValue > compareValue;
			case 'gte':
				return propertyValue >= compareValue;
			case 'ls':
				return propertyValue < compareValue;
			case 'lse':
				return propertyValue <= compareValue;
			default:
				return false;
		}
	}

	defaultMessage(args: ValidationArguments): string {
		const [operator, compareValue] = args.constraints as [ComparisonOperator, number];
		return `${args.property} must be ${operator} than ${compareValue}!`;
	}
}

export function Or(thisName: string, propertyNames: string[], validationOptions?: ValidationOptions) {
	return ValidateIf((object: Record<string, unknown>, value: unknown) => {
		// Check if the value is undefined or null
		if (value !== undefined && value !== null) {
			return true; // If the value is not undefined or null, proceed with validation
		}
		// If the value is undefined or null, check if any of the other properties are defined
		if (propertyNames.some((name) => Boolean(object[name]))) {
			return false; // pass this one
		}
		// If the value is undefined or null and none of the other properties are defined, the validation fails
		throw new Error(`One of these must be defined: ${[thisName].concat(propertyNames).join(' - ')}!`);
	}, validationOptions);
}

interface PathOptions {
	prefix?: string;
	postfix?: string;
}

@ValidatorConstraint({ name: 'fileOrDirExists', async: false })
export class FileOrDirExists implements ValidatorConstraintInterface {
	validate(p: string, args: ValidationArguments): boolean {
		const pathOptions: PathOptions = (args.constraints[0] as PathOptions) ?? {};
		const wholePath = path.join(pathOptions.prefix ?? '', p, pathOptions.postfix ?? '');
		return existsSync(wholePath);
	}

	defaultMessage(args: ValidationArguments): string {
		const obj = args.object as Record<string, unknown>;
		return `No such file or directory: ${obj[args.property]}`;
	}
}

type EnvResolver = string | ((obj: Record<string, unknown>) => string | Promise<string>);
type PipelineResolver = Pipeline[] | ((obj: Record<string, unknown>) => Pipeline[] | Promise<Pipeline[]>);

interface LicenseConstraint {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	model: mongoose.Model<any>;
	env?: EnvResolver;
	defaultNumber?: number;
	pipelines?: PipelineResolver;
}

@ValidatorConstraint({ name: 'countLicenseRestriction', async: true })
export class CountLicenseRestriction implements ValidatorConstraintInterface {
	async validate(_p: string, args: ValidationArguments): Promise<boolean> {
		try {
			const obj = args.object as Record<string, unknown>;
			const constraint = args.constraints[0] as LicenseConstraint;
			const { model, env, defaultNumber = 4 } = constraint;
			let { pipelines } = constraint;

			if (typeof pipelines === 'function') {
				pipelines = await pipelines(obj);
			}

			const currentCount = await count(model, { pipelines });
			const envKey = typeof env === 'function' ? await env(obj) : env;
			const preValue = process.env[envKey ?? 'LICENSE_LIMIT'];

			const limit = preValue ? parseInt(preValue, 10) : defaultNumber;
			return currentCount < limit;
		} catch {
			return false;
		}
	}

	defaultMessage(): string {
		return 'License violation!';
	}
}

// Keep old name for backward compatibility
export { CountLicenseRestriction as CountLicenseRestricion };

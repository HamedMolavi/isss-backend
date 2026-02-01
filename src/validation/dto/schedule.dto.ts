import {
	IsEmail,
	IsString,
	IsDefined,
	MinLength,
	IsBoolean,
	IsOptional,
	IsArray,
	IsNumber,
	IsObject,
	Validate,
	validateOrReject,
	ValidatorConstraint,
	ValidatorConstraintInterface,
	ValidationArguments
} from 'class-validator';
import mongoose, { Schema } from 'mongoose';
import { Comparison, CountLicenseRestricion } from '.';
import Schedule from '../../db/mongo/models/schedule';
import Model from '../../db/mongo/models/model';
import ModelToCamera from '../../db/mongo/models/modelToCamera';
import { readById } from '../../db/mongo/read.database';

// Helper function to validate normalized coordinates (0-1 range)
function isValidCoordinate(coord: unknown): coord is [number, number] {
	if (!Array.isArray(coord) || coord.length !== 2) return false;
	const [x, y] = coord;
	return (
		typeof x === 'number' &&
		typeof y === 'number' &&
		x >= 0 &&
		x <= 1 &&
		y >= 0 &&
		y <= 1
	);
}

// Helper function to validate entry_line or exit_line structure
function isValidLine(line: unknown): line is { start: [number, number]; end: [number, number] } {
	if (!line || typeof line !== 'object') return false;
	const obj = line as Record<string, unknown>;
	return (
		obj.start !== undefined &&
		obj.end !== undefined &&
		isValidCoordinate(obj.start) &&
		isValidCoordinate(obj.end)
	);
}

// Helper function to validate points array (4 points)
function isValidPointsArray(points: unknown): points is [[number, number], [number, number], [number, number], [number, number]] {
	if (!Array.isArray(points) || points.length !== 4) return false;
	return points.every((point) => isValidCoordinate(point));
}

interface LineItem {
	id?: string;
	points?: unknown;
	count_mode?: string;
	enabled?: boolean;
	entry_line?: unknown;
	exit_line?: unknown;
}

@ValidatorConstraint({ name: 'linesValidation', async: false })
export class LinesValidator implements ValidatorConstraintInterface {
	validate(lines: unknown): boolean {
		// Allow undefined/optional
		if (lines === undefined || lines === null) return true;
		if (!Array.isArray(lines)) return false;

		for (const line of lines) {
			if (!line || typeof line !== 'object') return false;
			const lineItem = line as LineItem;

			// Validate count_mode
			if (
				!lineItem.count_mode ||
				(lineItem.count_mode !== 'zone_exit' && lineItem.count_mode !== 'two_line')
			) {
				return false;
			}

			// Validate enabled (optional, defaults to true)
			if (lineItem.enabled !== undefined && typeof lineItem.enabled !== 'boolean') {
				return false;
			}

			// Validate based on count_mode - enforce exclusivity
			if (lineItem.count_mode === 'two_line') {
				// For two_line mode: entry_line and exit_line are required
				if (!isValidLine(lineItem.entry_line)) {
					return false;
				}
				if (!isValidLine(lineItem.exit_line)) {
					return false;
				}
				// points must NOT be present for two_line mode
				if (lineItem.points !== undefined && lineItem.points !== null) {
					return false;
				}
			} else if (lineItem.count_mode === 'zone_exit') {
				// For zone_exit mode: points is required (4 points)
				if (!isValidPointsArray(lineItem.points)) {
					return false;
				}
				// entry_line and exit_line must NOT be present for zone_exit mode
				if (lineItem.entry_line !== undefined && lineItem.entry_line !== null) {
					return false;
				}
				if (lineItem.exit_line !== undefined && lineItem.exit_line !== null) {
					return false;
				}
			}
		}

		return true;
	}

	defaultMessage(args: ValidationArguments): string {
		const lines = args.value as LineItem[] | undefined;
		if (!Array.isArray(lines)) {
			return 'lines must be an array';
		}

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line || typeof line !== 'object') {
				return `lines[${i}] must be an object`;
			}

			const countMode = (line as LineItem).count_mode;
			if (!countMode || (countMode !== 'zone_exit' && countMode !== 'two_line')) {
				return `lines[${i}].count_mode must be either 'zone_exit' or 'two_line'`;
			}

			if (countMode === 'two_line') {
				const lineItem = line as LineItem;
				if (!isValidLine(lineItem.entry_line)) {
					return `lines[${i}].entry_line is required for 'two_line' mode and must have start and end coordinates (each with 2 numbers in 0-1 range)`;
				}
				if (!isValidLine(lineItem.exit_line)) {
					return `lines[${i}].exit_line is required for 'two_line' mode and must have start and end coordinates (each with 2 numbers in 0-1 range)`;
				}
				// Check exclusivity: points should not be present
				if (lineItem.points !== undefined && lineItem.points !== null) {
					return `lines[${i}].points must not be present when count_mode is 'two_line'. Only entry_line and exit_line are allowed.`;
				}
			} else if (countMode === 'zone_exit') {
				if (!isValidPointsArray((line as LineItem).points)) {
					return `lines[${i}].points is required for 'zone_exit' mode and must be an array of 4 points (each with 2 numbers in 0-1 range)`;
				}
				// Check exclusivity: entry_line and exit_line should not be present
				const lineItem = line as LineItem;
				if (lineItem.entry_line !== undefined && lineItem.entry_line !== null) {
					return `lines[${i}].entry_line must not be present when count_mode is 'zone_exit'. Only points are allowed.`;
				}
				if (lineItem.exit_line !== undefined && lineItem.exit_line !== null) {
					return `lines[${i}].exit_line must not be present when count_mode is 'zone_exit'. Only points are allowed.`;
				}
			}
		}

		return 'lines validation failed';
	}
}

export class CreateScheduleBody {
	@Validate(CountLicenseRestricion, [
		{
			model: Schedule,
			env: async (object: any) =>
				'MAX_' + (await readById(Model, object.model_id)).category.toUpperCase() + 'S',
			pipelines: async (object: any) => [
				'model_camera_id',
				'model_camera_id.model_id',
				{ 'model_camera_id.model_id.category': (await readById(Model, object.model_id)).category }
			]
		}
	])
	@Validate(Comparison, ['gte', 0])
	@Validate(Comparison, ['lse', 100])
	@IsNumber()
	threshold?: number;
	@IsString()
	public start?: string;
	@IsString()
	public stop?: string;
	@IsArray()
	public dayOfWeek?: string;
	@IsString()
	public camera_id?: Schema.Types.ObjectId;
	@IsString()
	public model_id?: Schema.Types.ObjectId;
	@IsString()
	public description?: string;
	@IsArray()
	public users_alert?: Array<Schema.Types.ObjectId>;
	@IsObject()
	public sms?: object;
	@IsObject()
	public alert?: object;
	@IsBoolean()
	@IsOptional()
	public justHuman?: boolean;
	@IsBoolean()
	@IsOptional()
	public with_full_frame?: boolean;
	@IsBoolean()
	@IsOptional()
	public update_full_frame?: boolean;
	@IsString()
	public state?: string;
	@IsArray()
	@IsOptional()
	@Validate(LinesValidator)
	public lines?: Array<{
		id: string;
		points?: [[number, number], [number, number], [number, number], [number, number]];
		count_mode: 'zone_exit' | 'two_line';
		enabled?: boolean;
		entry_line?: {
			start: [number, number];
			end: [number, number];
		};
		exit_line?: {
			start: [number, number];
			end: [number, number];
		};
	}>;
}

export class UpdateScheduleBody {
	@IsOptional()
	@IsString()
	start?: string;
	@IsOptional()
	@IsString()
	stop?: string;
	@IsOptional()
	@IsString()
	model_id?: string;
	@IsOptional()
	@IsString()
	camera_id?: string;
	@IsOptional()
	@IsBoolean()
	montionDetection?: boolean;
	@IsOptional()
	@IsNumber()
	timeDuplicationDiagnoses?: number;
	@IsOptional()
	@Validate(Comparison, ['gte', 0])
	@Validate(Comparison, ['lse', 100])
	@IsNumber()
	threshold?: number;
	@IsOptional()
	@IsArray()
	dayOfWeek?: string[];
	@IsOptional()
	@IsArray()
	zones?: Array<[[number, number], [number, number], [number, number], [number, number]]>;
	@IsOptional()
	@IsNumber()
	min_people?: number;
	@IsOptional()
	@IsNumber()
	max_people?: number;
	@IsOptional()
	@IsString()
	public description?: string;
	@IsOptional()
	@IsArray()
	public users_alert?: Array<Schema.Types.ObjectId>;
	@IsOptional()
	public sms?: object;
	@IsOptional()
	public alert?: object;
	@IsBoolean()
	@IsOptional()
	public justHuman?: boolean;
	@IsString()
	public state?: string;
	@IsBoolean()
	@IsOptional()
	public with_full_frame?: boolean;
	@IsBoolean()
	@IsOptional()
	public update_full_frame?: boolean;
	@IsArray()
	@IsOptional()
	@Validate(LinesValidator)
	public lines?: Array<{
		id: string;
		points?: [[number, number], [number, number], [number, number], [number, number]];
		count_mode: 'zone_exit' | 'two_line';
		enabled?: boolean;
		entry_line?: {
			start: [number, number];
			end: [number, number];
		};
		exit_line?: {
			start: [number, number];
			end: [number, number];
		};
	}>;
}

export class UpdateActiveScheduleBody {
	@IsOptional()
	public sms?: object;
	@IsOptional()
	public alert?: object;
	@IsArray()
	public schedules?: Array<Schema.Types.ObjectId>;
	// @IsString()
	// public state?: string;
}

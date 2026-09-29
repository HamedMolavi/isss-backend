import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';
import { isValidPlateInput } from '../tools/car.tools';

@ValidatorConstraint({ name: 'isPlateNumber', async: false })
export class IsPlateNumber implements ValidatorConstraintInterface {
	validate(value: unknown): boolean {
		return isValidPlateInput(value as never);
	}

	defaultMessage(args: ValidationArguments): string {
		return `${args.property} must contain a complete valid plate number`;
	}
}

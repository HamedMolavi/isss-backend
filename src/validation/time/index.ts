import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import Time from "../../tools/time.tools";

@ValidatorConstraint({ name: 'timeAndDate', async: false })
export class TimeAndDateValidator implements ValidatorConstraintInterface {
  validate(time: string, args: ValidationArguments & { object: any }) {
    const date = args.object[args.constraints[0]];
    return time && date;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Both time and date must be present.';
  }
}

@ValidatorConstraint({ name: 'endgtrStart', async: false })
export class EndgtrStartValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments & { object: any }) {
    if (!!args.object.date_start && !!args.object.date_end) {
      const start = (new Date(args.object.date_start + " " + args.object.time_start + Time.getUtcOffset(process.env.TZ ?? "Asia/Tehran"))).getTime();
      const end = (new Date(args.object.date_end + " " + args.object.time_end + Time.getUtcOffset(process.env.TZ ?? "Asia/Tehran"))).getTime();
      return end >= start;
    }
    return true;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Custom function validation failed.';
  }
}

@ValidatorConstraint({ name: 'arrayValidation', async: false })
export class ArrayValidation implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments & { object: any }) {
    if (!Array.isArray(args.object[args.property])) return false;
    return !args.object[args.property].some((el: any) => !(typeof el === args.constraints[0]));
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} Must be Array of ${args.constraints[0]}!`;
  }
}

@ValidatorConstraint({ name: 'comparison', async: false })
export class Comparison implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments & { object: any, constraints: ["gt" | "gte" | "ls" | "lse", number] }) {
    if (typeof (args.object[args.property]) !== "number") return false;
    switch (args.constraints[0]) {
      case "gt":
        return args.object[args.property] > args.constraints[1];
      case "gte":
        return args.object[args.property] >= args.constraints[1];
      case "ls":
        return args.object[args.property] < args.constraints[1];
      case "lse":
        return args.object[args.property] <= args.constraints[1];
    }
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} Must be ${args.constraints[0]} than ${args.constraints[1]}!`;
  }
}
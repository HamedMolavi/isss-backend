import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments, ValidationOptions, registerDecorator, ValidateIf } from 'class-validator';
import Time from "../../tools/time.tools";
import { RequestHandler, Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
// import { sanitize, Trim } from "class-sanitizer";
import { ApiError } from "../../types/classes/error.class";
import path from 'path';
import { existsSync } from 'fs';

export function dtoValidationMiddleware(type: any, options?: { skipMissingProperties?: boolean, detailedMassage?: boolean, info?: string }): RequestHandler {
  let defaultOpt = { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"] === "development" ? true : false, info: undefined };
  //@ts-ignore
  for (const key in options) defaultOpt[key] = options[key];
  return async (req: Request, _res: Response, next: NextFunction) => {
    await new Promise((resolve, _reject) => resolve(plainToInstance(type, req.body)))
      .then((dtoObj: any) => validate(dtoObj, { skipMissingProperties: defaultOpt["skipMissingProperties"] }))
      .then((errors: ValidationError[]) => {
        if (errors.length > 0) {
          const dtoErrorsString = defaultOpt["detailedMassage"]
            ? errors.map((error: ValidationError) => (Object as any).values(error.constraints)).join(", ")
            : "Bad request!"
          if (!!defaultOpt["info"]) req.flash("error", defaultOpt["info"]);
          next(new ApiError(400, dtoErrorsString));
        } else {
          //TODO: sanitize the object and call the next middleware
          // sanitize(dtoObj);
          // req.body = dtoObj;
          next();
        };
      })
      .catch(err => next(new ApiError(400, err)))
  };
};

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
  validate(image_str: any, args: ValidationArguments & { object: any }) {
    const jpegPrefix = 'data:image/jpeg;base64,';
    const pngPrefix = 'data:image/png;base64,';
    if (image_str?.startsWith(jpegPrefix)) {
      image_str = image_str?.substring(jpegPrefix.length);
    } else if (image_str?.startsWith(pngPrefix)) {
      image_str = image_str?.substring(pngPrefix.length);
    }
    const base64Regex = /^(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/;
    return base64Regex.test(image_str) && !!image_str;
  }

  defaultMessage(args: ValidationArguments) {
    return `${args.property} should be a valid JPG or PNG image encoded with base64.`;
  }
}

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

export function Or(thisName: string, propertyNames: string[], validationOptions?: ValidationOptions) {
  return ValidateIf((object: any, value: any) => {
    // Check if the value is undefined or null
    if (value !== undefined && value !== null) {
      return true; // If the value is not undefined or null, proceed with validation
    }
    // If the value is undefined or null, check if any of the other properties are defined
    if (propertyNames.some((name) => !!object[name])) {
      return false; // pass this one
    }
    // If the value is undefined or null and none of the other properties are defined, the validation fails
    throw new Error(`One of these must be defiend: ${[thisName].concat(propertyNames).join(" - ")}!`)
  }, validationOptions);
}

@ValidatorConstraint({ name: 'timeAndDate', async: false })
export class FileOrDirExists implements ValidatorConstraintInterface {
  validate(p: string, args: ValidationArguments & { object: any }) {
    const pathes: { prefix: string | undefined, postfix: string | undefined } = args.constraints[0] ?? {};
    const wholePath = path.join(pathes.prefix ?? "", p, pathes.postfix ?? "");
    if (existsSync(wholePath)) return true;
    return false;
  }

  defaultMessage(args: ValidationArguments & { object: any }) {
    return `No such file or directory: ${args.object[args.property]}`;
  }
}
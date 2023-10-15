import { RequestHandler, Request, Response, NextFunction } from "express";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
// import { sanitize, Trim } from "class-sanitizer";
import { ApiError } from "../../types/classes/error.class";

export function dtoValidationMiddleware(type: any, options?: { skipMissingProperties?: boolean, detailedMassage?: boolean, info?: string }): RequestHandler {
  let defaultOpt = { skipMissingProperties: false, detailedMassage: process.env["NODE_ENV"]==="development" ? true : false, info: undefined };
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

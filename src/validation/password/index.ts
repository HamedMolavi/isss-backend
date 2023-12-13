import { NextFunction, Request, Response } from "express";
import { Requirements } from "../../types/interfaces/password.interface";
import { ValidatePassword } from "../../tools/password.tools";
import { ApiError } from "../../types/classes/error.class";

export function passwordValidator(requirementsSchema: Requirements, passwordFieldName: string = "password") {
  const passwordValidator = new ValidatePassword(requirementsSchema);
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.body[passwordFieldName]) next();
    let resultVerifyPassword = passwordValidator.getStrength(req.body[passwordFieldName]);
    if (resultVerifyPassword < 99) {
      req.flash("error", "Password is not strong enough");
      return next(new ApiError(400, "Password is not strong enough"));
    };
    return next();
  };
};
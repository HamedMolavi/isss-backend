import { Router, Request, Response, NextFunction } from "express";
import { ApiError } from "../types/classes/error.class";

export function injectDataMiddleware(fn: CallableFunction, options?: { params?: boolean, injData?: string, spread?: boolean }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!!options?.spread) {
        let result: Object = await fn(!!options?.params ? req.params : req.body)
        req.body = { ...req.body, ...result }
      } else {
        req.body[options?.injData || "injData"] = await fn(!!options?.params ? req.params : req.body);
      };
      next();
    } catch (error) {
      req.flash("error", "Internal Error!");
      return next(new ApiError(500, "Internal Error!"));
    };
  };
};
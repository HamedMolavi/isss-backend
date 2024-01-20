import { NextFunction, Request, Response } from "express";
import { resourceFunctions } from "../tools/resources.tools";
import { ApiError } from "../types/classes/error.class";

export function getResourcesMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let resources = req.query["resource"] as string | Array<string>;
      if (!!resources) {
        if (typeof resources === "string") {
          if (Object.keys(resourceFunctions).includes(resources)) return res.json(await resourceFunctions[resources as keyof typeof resourceFunctions]());
          else return res.json(await resourceFunctions["all"]());
        } else if (resources instanceof Array && !!resources.length) {
          let result: any = {};
          if (!resources.every((el) => Object.keys(resourceFunctions).includes(el as string))) return res.json({ "all": await resourceFunctions["all"]() });
          for (const resource of resources) {
            result[resource as string] = resourceFunctions[resource as keyof typeof resourceFunctions]();
          }
        }
      }
      return res.json(await resourceFunctions["all"]());
    } catch (error) {
      return next(new ApiError(500, "internal server error , " + String(error)));
    };
  };
};
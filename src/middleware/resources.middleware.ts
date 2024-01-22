import { NextFunction, Request, Response } from "express";
import { resourceFunctions } from "../tools/resources.tools";
import { ApiError } from "../types/classes/error.class";

export function getResourcesMiddleware() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let resources = req.query["resource"] as string | Array<string> | undefined;
      let processes = req.query["processes"] as string | Array<string> | undefined;
      let containers = req.query["containers"] as string | Array<string> | undefined;
      let input = processes ?? containers;
      if (typeof input === "string") input = input.split(",").map((el) => el.trim());
      else input = input?.map((el) => el.trim());

      switch (true) {
        case !resources || (typeof resources === "string" && !Object.keys(resourceFunctions).includes(resources)):
          return res.json(await resourceFunctions["all"]());
        case typeof resources === "string":
          return res.json(await resourceFunctions[resources as keyof typeof resourceFunctions](input));
        case Array.isArray(resources) && !!resources.length:
          let result: any = {};
          if (!(resources as string[]).every((el) => Object.keys(resourceFunctions).includes(el as string))) return res.json({ "all": await resourceFunctions["all"]() });
          for (const resource of (resources as string[])) {
            result[resource as string] = resourceFunctions[resource as keyof typeof resourceFunctions]();
          };
          return res.json(result);
      };
    } catch (error) {
      return next(new ApiError(500, "internal server error , " + String(error)));
    };
  };
};
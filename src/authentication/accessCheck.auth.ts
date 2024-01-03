import { Request, Response, NextFunction } from "express";
import { ApiError } from "../types/classes/error.class";
import { Access } from "../types/enums/access.enum";
import mongoose, { Document, Types, isObjectIdOrHexString } from "mongoose";
import { ICamera } from "../types/interfaces/camera.interface";
import Camera from "../db/mongo/models/camera";
import { read } from "../db/mongo/read.database";
import AccessLevel from "../db/mongo/models/accessLevel";
import { IAccessLevel } from "../types/interfaces/accessLevel.interface";


// CRUD => Create, Read, Update, Delete
const accessTranslation = {
  "POST": "Create",
  "GET": "Read",
  "PATCH": "Update",
  "DELETE": "Delete"
};
// PGPD => POST, GET, PATCH, DELETE
const accessCharPositions = {
  "POST": -4, // minus for reversing
  "GET": -3,
  "PATCH": -2,
  "DELETE": -1
};

export default function accessCheck(access: Access, role: string, options?: { extraFunction?: (req: Request) => boolean }) {
  return function middleware(req: Request, _res: Response, next: NextFunction) {
    const user = req.user;
    switch (user.role) {
      case "admin":
        break;
      case "user":
        if (access === "extra") {
          if (!options?.extraFunction || !options.extraFunction(req)) {
            req.flash("error", "No access!");
            return next(new ApiError(403, "No access!"));
          } else break;
        }
        if (user[access] !== true) {
          req.flash("error", "No access => " + access + " access needed.");
          return next(new ApiError(403, "No access => " + access + " access needed."));
        };
        if (role === "admin") {
          req.flash("error", "You are not admin");
          return next(new ApiError(403, "You are not admin"));
        };
        break;
      default:
        break;
    }
    return next();
  };
};

export function userCanGetHisInfo(req: Request) {
  const probableParamId = req.path.split('/').at(-1);
  if (req.method == 'GET' &&
    !!req.originalUrl.match("/api/v1/config/admin/users/") &&
    isObjectIdOrHexString(probableParamId) &&
    probableParamId === req.user._id.toString()) {
    return true;
  };
  return false; // no access
};



export function testAccessCheck(access: keyof IAccessLevel, bitMapNumberFromRight?: number) {
  /**
   * @access
   * @bitMapNumberFromRight
   */
  return async function middleware(req: Request, _res: Response, next: NextFunction) {
    const user = req.user;
    const userAccessLevel = await AccessLevel.findById(new mongoose.Types.ObjectId(user.access_level)) as IAccessLevel & { _id: mongoose.Types.ObjectId; };
    const userAccess = userAccessLevel[access] as number;
    const method = req.method as "GET" | "POST" | "DELETE" | "PATCH";
    if (!hasAccess(userAccess, bitMapNumberFromRight ?? method)) {
      req.flash("error", `No [${access} ${accessTranslation[method]}] access!`);
      return next(new ApiError(403, `No [${access} ${accessTranslation[method]}] access!`));
    }
    return next();
  };
};


function hasAccess(userAccess: number, methodOrNumber: "GET" | "POST" | "DELETE" | "PATCH" | number): boolean {
  const binUserAccess = (userAccess >>> 0).toString(2).slice(-4);
  if (typeof methodOrNumber === 'number') return binUserAccess.at(-methodOrNumber) == "1";
  return binUserAccess.at(accessCharPositions[methodOrNumber]) == "1";
}

// export function cameraAccessCheck(camerasFieldName: string, options?: {
//   next?: boolean,
//   save?: string,
//   send?: CallableFunction,
// }) {
//   return async function middleware(req: Request, res: Response, next: NextFunction) {
//     const user = req.user;
//     type camera = (Document<unknown, any, ICamera> & Omit<ICamera & Required<{ _id: Types.ObjectId; }>, never>);
//     let accessedCameras: camera[] = user.role === "admin"
//       ? req.body[camerasFieldName]
//       : req.body[camerasFieldName].filter((doc: camera) => user.camera_access?.includes(doc._id));

//     if (!!options?.next) {
//       if (!!options.save) req.body[options.save] = accessedCameras;
//       else req.body["docs"] = accessedCameras;
//       return next();
//     };
//     //return response to client
//     let strPage = req.query.page as string;
//     let page = parseInt(strPage) > 0 ? parseInt(strPage) : 1;
//     let strPerPage = req.query.perPage as string;
//     let perPage = strPerPage?.toLowerCase() === "all"
//       ? 10000
//       : parseInt(strPerPage) > 0 ? parseInt(strPerPage) : 1;
//     return res.status(200).json({
//       success: true,
//       data: !!options?.send
//         ? accessedCameras.reduce((pre, cur) => {
//           const fn = options.send as CallableFunction;
//           const el = fn(cur);
//           if (!!el) pre.push(el);
//           return pre;
//         }, [] as Document<any, any, any>[])
//         : accessedCameras,
//       page: page,
//       perPage: perPage,
//       total: await Camera.countDocuments().exec(),
//       pages: Math.ceil(accessedCameras.length / perPage),
//     });
//   };
// };
import { Request, Response, NextFunction, RequestHandler } from "express";
import { ApiError } from "../types/classes/error.class";
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

export function userCanGetHisInfo(req: Request) {
  let probableParamId = req.path.split('/').find((el) => isObjectIdOrHexString(el));
  if (['GET', 'PATCH'].includes(req.method) &&
    !!req.originalUrl.match("/api/v1/config/admin/users/") &&
    !!probableParamId &&
    probableParamId === req.user._id.toString()) {
      //user can not change his "role" or "access_level"
      req.body.role = undefined;
      req.body.access_level = undefined;
      return true;
  };
  return false; // no access
};



export function accessCheck(access: keyof IAccessLevel, options?: { bitMapNumberFromRight?: number, extraFunction?: (req: Request, userAccess: number | undefined) => boolean | Promise<boolean> }) {
  /**
   * @access
   * @bitMapNumberFromRight
   */
  return async function middleware(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    const userAccessLevel = await AccessLevel.findById(new mongoose.Types.ObjectId(user.access_level));
    const userAccess = userAccessLevel?.[access] as number | undefined;
    const method = req.method as "GET" | "POST" | "DELETE" | "PATCH";
    if (userAccessLevel && userAccess && hasAccess(userAccess, options?.bitMapNumberFromRight ?? method)) return next(); // first: check the role
    if (!!options?.extraFunction && await options.extraFunction(req, userAccess)) return next(); // second: check manual pass function
    req.flash("error", `No [${access} ${accessTranslation[method]}] access!`);
    return next(new ApiError(403, `No [${access} ${accessTranslation[method]}] access!`));
  };
};


export function hasAccess(userAccess: number, methodOrNumber: "GET" | "POST" | "DELETE" | "PATCH" | number): boolean {
  const binUserAccess = "0000" + (userAccess >>> 0).toString(2);
  if (typeof methodOrNumber === 'number') return binUserAccess.at(-methodOrNumber) == "1";
  return binUserAccess.at(accessCharPositions[methodOrNumber]) == "1";
};

export function roleCheck(role: string, options?: { extraFunction?: (req: Request, res: Response) => boolean }) {
  return async function middleware(req: Request, res: Response, next: NextFunction) {
    const user = req.user;
    if (user.role === role) return next(); // first: check the role
    if (!!options?.extraFunction && options.extraFunction(req, res)) return next(); // second: check manual pass function
    req.flash("error", `No access!`);
    return next(new ApiError(403, `No access!`));
  };
};

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
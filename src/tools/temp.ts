import { Request } from "express";

export function getIdsFromBody(req: Request, idPropertyName: string | Array<string>) {
  let ids: Array<any & { toString: () => string }> = [];
  if (typeof idPropertyName === "string")
    if (typeof req.body[idPropertyName] === "string") ids.push(req.body[idPropertyName]);
    else if (Array.isArray(req.body[idPropertyName])) ids = req.body[idPropertyName];
    else throw new TypeError(`Type error req.body[${idPropertyName}] is not string or array: ${req.body[idPropertyName]}`);
  else {
    let tmp = req.body[idPropertyName[0]];
    for (let indx = 1; indx < idPropertyName.length; indx++) {
      if (typeof tmp === "string") ids.push(tmp);
      else if (Array.isArray(tmp)) {
        if (tmp.every((el) => typeof el === "string")) ids.concat(...tmp);
        else for (const [i, item] of tmp.entries()) tmp[i] = item[idPropertyName[indx]];
      }
      else tmp = req.body[idPropertyName[indx]]
    }
  }
  return ids.map((id) => id.toString());
}


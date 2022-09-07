import md5 from "md5";
import { IFileInRedis } from "./fileUpload";

//function for hash json for create id save picture in redis
export function hashJson(data: string, personnel_id: string) {
  //define object for save in redis
  let fileInRedis = {
    Personnel_id: personnel_id,
    full_frame: data,
    face: "",
    embedding: "",
    has_face: 0
  };
  const secretKey = process.env["KEY_HASH_OBJECT"] as string;
  //return hash object for id in redis
  return md5(JSON.stringify(fileInRedis) + secretKey);
}

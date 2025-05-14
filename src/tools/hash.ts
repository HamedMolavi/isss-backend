import md5 from "md5";

//function for hash json for create id save picture in redis
export function hashString(imageBase64: string, secret: string) {
  //return hash object for id in redis
  return md5(imageBase64 + secret);
}

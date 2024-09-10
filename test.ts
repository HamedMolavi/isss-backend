import { readdirSync, readFileSync } from "fs";
import md5 from "md5";
import path from "path";
const secret = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImFhYSI6dHJ1ZX0"

const hashes: { imagePath: string; hash_id: string }[] = [];
const successDir = path.join(__dirname, './face_DB/DB_success_20240909_193738');
for (const pdir of readdirSync(successDir)) {
  const pdirPath = path.join(successDir, pdir);
  if (pdir.includes('.')) { console.log("Not a directory", pdirPath); continue; }
  for (const imageName of readdirSync(pdirPath)) {
    const imagePath = path.join(pdirPath, imageName)
    const imageBase64 = readFileSync(imagePath, 'base64');
    const hash_id = md5(imageBase64 + secret);
    hashes.push({ imagePath, hash_id })
  }
}

while (!!hashes.length) {
  const hash = hashes.pop();
  const dup = hashes.find((h) => h.hash_id === hash?.hash_id);
  if (!!dup) console.log(hash?.imagePath, dup.imagePath)
}
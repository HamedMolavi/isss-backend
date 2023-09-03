import dotenv from "dotenv";
import fs from "fs";
import { join } from "path";
import defaultEnvVars from "./env.default";


export default function extraEnvConfigs() {
  try {
    //read default values first.
    process.env = {...process.env, ...defaultEnvVars}
    //read and overwrite from .env file
    dotenv.config({ path: join(__dirname, "../../.env"), encoding: 'utf8', debug: false, override: true });

    //read key and cert from files for certificate in https server
    const key = fs.readFileSync(__dirname + "/../../security/sslconfig/key.pem", "utf-8");
    const cert = fs.readFileSync(__dirname + "/../../security/sslconfig/cert.pem", "utf-8");
    process.env["OPTIONS"] = JSON.stringify({
      key: key,
      cert: cert,
    });
  } catch (err) {
    console.error("Error in reading key and pem...");
    console.error(err);
    process.exit(1);
  };
};

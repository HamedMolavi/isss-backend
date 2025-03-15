import dotenv from "dotenv";
import { join } from "path";


export default function extraEnvConfigs() {
  try {
    dotenv.config({ path: join(__dirname, "../../.env"), encoding: 'utf8', debug: false, override: true });
  } catch (err) {
    console.error("Error in reading key and pem...");
    console.error(err);
    process.exit(1);
  };
};

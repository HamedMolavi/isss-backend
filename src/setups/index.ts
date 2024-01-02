import { setupInteractive } from "./interactiveShell.setup";
import connectToDBs from "../db/index.database";
import { setUpPassport } from "../setups/passport.setup";
import seedSetup from "./seed.setup";
import { initBalancer } from "../tools/loadBalancer.tools";


export default async function setup() {
  await setupInteractive();
  await connectToDBs({ mongo: process.env["MONGODB_URL"].split(",").map((el) => el.trim()), redis: process.env["REDIS_URL"] });
  await seedSetup();
  setUpPassport();
  await initBalancer();
};
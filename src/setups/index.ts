import { setupInteractive } from "./interactiveShell.setup";
import connectToDBs from "../db/index.database";
import { setUpPassport } from "../setups/passport.setup";


export default async function setup() {
  await setupInteractive();
  await connectToDBs({ mongo: process.env["MONGODB_URL"], redis: process.env["REDIS_URL"] });
  setUpPassport();
};
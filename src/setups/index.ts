import { setupInteractive } from "../interactive/interactive.cluster";
import connectToDBs from "../db/index.database";
import { setUpPassport } from "./passport.setup";
import seedSetup from "./seed.setup";
import { initBalancer } from "../tools/loadBalancer.tools";
import { SignalConsumer } from "../tools/systemSignal.tools";
import { setupLogger } from "./logger.setup";


export default async function setup() {
  await setupInteractive();
  const dbResults = await connectToDBs({ mongo: process.env["MONGODB_URL"].split(",").map((el) => el.trim()), redis: process.env["REDIS_URL"] ,elastic:process.env["ELASTIC_SEARCH"]});
  process.esclient = dbResults["elastic"];
  await seedSetup();
  setUpPassport();
  await initBalancer();
  await SignalConsumer.setupDefault();
  await setupLogger();
};
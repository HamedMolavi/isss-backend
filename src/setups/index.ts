import connectToDBs from "../db/index.database";
import seedSetup from "./seed.setup";
import cacheSetup from "./cache.setup";


export default async function setup() {
  const dbResults = await connectToDBs({ mongo: process.env["MONGODB_URL"].split(",").map((el) => el.trim()), redis: process.env["REDIS_URL"]});
  await seedSetup();
  await cacheSetup();
};
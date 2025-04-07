import connectToDBs from "../db/index.database";
import cacheSetup from "./cache.setup";
import seedSetup from "./seed.setup";


export default async function setup() {
  const dbResults = await connectToDBs({ mongo: process.env["MONGODB_URL"].split(",").map((el) => el.trim()), redis: process.env["REDIS_URL"] ,elastic: process.env["ELASTIC_SEARCH"]});
  process.esclient = dbResults["elastic"];
  await seedSetup();
  await cacheSetup();
};
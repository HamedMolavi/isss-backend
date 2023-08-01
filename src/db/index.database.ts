import connectToMongo from "./mongo/connect.database";
import connectToRedis from "./redis/connect.database";

async function connectToDBs(urls: { mongo: undefined | string, redis: undefined | string }) {
  let results: { [key: string]: any } = {};
  if (!!urls["mongo"]) results["mongo"] = await connectToMongo(urls["mongo"]);
  if (!!urls["redis"]) results["redis"] = await connectToRedis(urls["redis"]);
  return results;
};

export default connectToDBs
import { connectToElastic } from "./elastic/connect.database";
import connectToMongo from "./mongo/connect.database";
import connectToRedis from "./redis/connect.database";

async function connectToDBs(urls: { mongo: undefined | string[], redis: undefined | string, elastic: undefined | string }) {
  let results: { [key: string]: any } = {};
  let connected = false;
  if (!!urls["mongo"]) {
    for await (const url of urls["mongo"]) {
      try {
        results["mongo"] = await connectToMongo(url);
        connected = true;
        break;
      } catch (error) {
        continue;
      };
    };
    if (!connected) process.exit(1);
  };
  if (!!urls["redis"]) results["redis"] = await connectToRedis(urls["redis"]);
  if(!!urls["elastic"]) results["elastic"] = await connectToElastic(urls["elastic"]);
  return results;
};

export default connectToDBs
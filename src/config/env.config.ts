import dotenv from "dotenv";
import fs from "fs";
import { join } from "path";
import { read } from "../db/mongo/read.database";
import Model from "../db/mongo/models/model";
import { Schema } from "mongoose";
import { IModel } from "../types/interfaces/model.interface";
import { IConsumer } from "../types/interfaces/kafka.interface";

dotenv.config({ path: join(__dirname, "../../.env"), encoding: 'utf8', debug: true, override: false });

export default function extraEnvConfigs() {
  try {
    //check for env varialbles and fill non-existing ones
    const allEnv = [
      ["NODE_ENV", "development"],
      ["PORT_http", "4000"],
      ["PORT_https", "3000"],
      ["HOST", "127.0.0.1"],
      ["BASE_URL", "127.0.0.1:3000/api/v1"],
      ["MONGODB_URL", "mongodb://localhost:27017/test"],
      ["REDIS_URL", "redis://localhost:6379"],
      ["ELASTIC_SEARCH", "<<ip : port elasticksearch>>"],
      ["REQUEST_LOG_FORMAT", ""],
      ["REQUEST_LOG_DIR", "../logs"],
      ["RECORD_STREAM_TIME", "10"],
      ["SESSION_SECRET", "M<Y$N0A=MHEqIvS,D#E!V!M]OWL/AiV4i"],
      ["KAFKA_BOOTSTRAP", "localhost:9091"],
    ]
    allEnv.forEach(env_default => {
      if (!process.env[env_default[0]]) process.env[env_default[0]] = env_default[1];
    });

    //read key and cert from files for certificate in https server
    const key = fs.readFileSync(__dirname + "/../../security/sslconfig/key.pem", "utf-8");
    const cert = fs.readFileSync(__dirname + "/../../security/sslconfig/cert.pem", "utf-8");
    process.env["OPTIONS"] = JSON.stringify({
      key: key,
      cert: cert,
    });
    //declare an empty consumers' map to be filled and updated over time
    let CONSUMERS: Map<string, IConsumer> = new Map();
    process["CONSUMERS"] = CONSUMERS;
    // setting AI model categories into a global variable
    read(Model).then((models: (IModel & { _id: Schema.Types.ObjectId; })[]) => {
      process["MODELS"] = [];
      for (const model of models) {
        process["MODELS"].push(model.category);
      };
    });

  } catch (err) {
    console.error("Error in reading key and pem...");
    console.error(err);
    process.exit(1);
  };
};

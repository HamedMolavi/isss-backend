import { Client } from "@elastic/elasticsearch";
import { IConsumer } from "./interfaces/kafka.interface";

export { };
declare global {
  namespace NodeJS {
    interface Process {
      esclient: Client
    }
    interface ProcessEnv {
      HOST: string
      BASE_URL: string
      MONGODB_URL: string
      REDIS_URL: string
      NODE_ENV: "development" | "production"
      KAFKA_BOOTSTRAP: string
      PORT_HTTP: string
    }
  }
}

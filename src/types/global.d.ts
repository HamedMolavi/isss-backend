import { IConsumer } from "./interfaces/kafka.interface";

export { };
declare global {
  namespace NodeJS {
    interface Process {
      load: Object & { [key: string]:  Object &{ [key: string]: number } }
    }
    interface ProcessEnv {
      MAX_LOAD: string
      PORT_HTTP: string
      PORT_HTTPS: string
      HOST: string
      BASE_URL: string
      MONGODB_URL: string
      REDIS_URL: string
      SESSION_SECRET: string
      ELASTIC_SEARCH: string
      REQUEST_LOG_FORMAT: string
      NODE_ENV: "development" | "production"
      WEB_STREAM: string
      REQUEST_LOG_FILE: string
      KAFKA_BOOTSTRAP: string
      SAMPLE_STREAM_URI: string
      WORD_BEFORE_REPLACE_STREAM: string
      WORD_AFTER_REPLACE_STREAM: string
      MODELS: string
      LOGTYPES: string
      MDPATH: string
    }
  }
}

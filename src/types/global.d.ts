import { Consumer } from "kafkajs";

export {}
declare global {
  namespace NodeJS {
    interface Process {
      CONSUMERS: Map<string, Consumer | undefined>;
    }
  }
}


import { Consumer } from "kafkajs";

export declare module 'kafkajs' {
  export interface EventHandler {
    setupConsumerEvents: (eventHandlers: Array<{ event: ValueOf<ConsumerEvents>, handler: (event: any) => void }>) => void;
    delete: () => Promise<string>
    key: string
  };
  export type EConsumer = Consumer & EventHandler
};
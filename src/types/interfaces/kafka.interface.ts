import { Consumer, ConsumerEvents, ValueOf } from "kafkajs";

export interface IConsumer extends Consumer {
  setupConsumerEvents: (eventHandlers: Array<{ event: ValueOf<ConsumerEvents>, handler: (event: any) => void }>) => void;
  delete: () => Promise<string>
  key: string
}
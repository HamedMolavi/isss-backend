import { ConsumerEvents, EachMessagePayload, ValueOf } from "kafkajs";
import { kafkaFactory } from "./factory.kafka";
import { randomUuid } from '../tools/index.tools';
import { IConsumer } from "../types/interfaces/kafka.interface";

export async function createConsumer(
  key: string,
  eachMessage: (payload: EachMessagePayload) => Promise<void>,
  options?: {
    fromBeginning?: boolean | undefined,
    groupId?: string | undefined,
  }
) {
  const consumer = kafkaFactory({ clientId: key, type: "consumer", groupId: randomUuid(5) }) as IConsumer; // TODO: when I place them in one group I get this error: The group is rebalancing, so a rejoin is needed 
  await consumer.subscribe({ topic: key, fromBeginning: options?.fromBeginning ?? false });
  await consumer.run({
    eachMessage
  }).then(_ => process.env["NODE_ENV"] === "development" ? console.log("Consumer", key, "connected!") : undefined);
  consumer["key"] = key;
  consumer["setupConsumerEvents"] = setupConsumerEvents(consumer);
  consumer["delete"] = deleteConsumer(consumer);
  return consumer;
};

function setupConsumerEvents(consumer: IConsumer) {
  return function (eventHandlers: Array<{ event: ValueOf<ConsumerEvents>, handler: (event: any) => void }>) {
    //TODO: default event handlers
    consumer.on("consumer.crash", consumer.delete);
    consumer.on("consumer.stop", consumer.delete);
    for (const eventHandler of eventHandlers) {
      consumer.on(eventHandler.event, eventHandler.handler);
    };
  };
};
function deleteConsumer(consumer: IConsumer) {
  return async function () {
    const key = consumer.key;
    await consumer?.disconnect()
      .then((_: void) => process["CONSUMERS"].delete(key))
      .then((flag: boolean) => process.env["NODE_ENV"] === "development" ? flag ? console.log("Consumer", key, "disconnected!") : console.log("Cant delete Consumer", key) : undefined);
    return key;
  };
};

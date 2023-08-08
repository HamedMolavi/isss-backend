import { EConsumer } from "kafkajs";
import { Server } from "socket.io";
import { createConsumer } from "../kafka/consumer.kafka";

// TODO: clean this shit up
export class KafkaServer {
  private io: Server;
  public checkConsumersInterval: NodeJS.Timer | undefined;
  public consumers: Map<string, EConsumer>; // local set of consumers to check with global every interval

  ////////////////////////////////////////////////////////////////////////////////////////////
  constructor(io: Server) {
    this.io = io;
    this.consumers = new Map(); // initializing
    this.initConsumers();
  };
  ////////////////////////////////////////////////////////////////////////////////////////////
  private async initConsumers() {
    for (const key of process["CONSUMERS"].keys()) {
      const consumer = await this.createConsumer(key);
      process["CONSUMERS"].set(key, consumer);
    };
    this.checkConsumersInterval = this.checkConsumersThread(); // initializing checking thread
  };
  ////////////////////////////////////////////////////////////////////////////////////////////
  private async createConsumer(key: string) {
    const io = this.io;
    const eventName = key.split("_")[0]; // stream, fire, face, human, ...
    const roomId = key.split("_").slice(1).join("_"); // room id equals to camera id
    const consumer = await createConsumer(key, async function eachMessage({ topic, partition, message, heartbeat }) { // heartbeat function to send manual heartbeat as messages recieved
      if (process["CONSUMERS"].has(key)) io.to(roomId).emit(eventName, message.value); // TODO: add headers and dto schema
      else { };//TODO: cam_id doesn't exist in rooms so it should be deleted
    });
    this.consumers.set(key, consumer);
    return consumer;
  };
  ////////////////////////////////////////////////////////////////////////////////////////////
  private checkConsumersThread(): NodeJS.Timer {
    return setInterval(async () => {
      // Camera post save => sets a <key, undefined> in global consumer map => replace and initializa that undefined with a consumer
      for (const key of process["CONSUMERS"].keys())
        if (process["CONSUMERS"].get(key) === undefined)
          process["CONSUMERS"].set(key, await this.createConsumer(key));
      // Camera post delete => deletes representive set in global consumer map
      for (const key of this.consumers.keys())
        if (!process["CONSUMERS"].has(key))
          this.consumers.delete(await this.consumers.get(key)?.delete() as string);
    }, 1000);
  };
};


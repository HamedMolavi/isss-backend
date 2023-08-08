import { Consumer, ConsumerCrashEvent } from "kafkajs";
import { kafkaFactory } from "../tools/kafka";
import { Server } from "socket.io";

// TODO: clean this shit up
// topics' names are like this: cam_{id}, which id is camera id in mongodb (object id)
// but sockets' rooms are named by a random string of roomId
export class MediaServer {
  private io: Server;
  public checkConsumersInterval: NodeJS.Timer | undefined;

  constructor(io: Server) {
    this.io = io;
    this.initConsumers();
  };
  private async initConsumers() {
    for (const key of process["CONSUMERS"].keys()) { // this syntax of for loop is sync, forEach is not sync.
      const consumer = await this.createConsumer(key);
      process["CONSUMERS"].set(key, consumer);
    };
    this.checkConsumersInterval = this.checkConsumersThread();
  };
  private async createConsumer(key: string) {
    const eventName = key.split("_")[0]; // stream, fire, face, human, ...
    const roomId = key.split("_").slice(1).join("_"); // camera id equals to room id
    const consumer = kafkaFactory({ clientId: key, type: "consumer" }) as Consumer; // TODO: when I place them in one group I get this error: The group is rebalancing, so a rejoin is needed 
    await consumer.subscribe({ topic: key, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ topic, partition, message, heartbeat }) => { // heartbeat function to send manual heartbeat as messages recieved
        if (process["CONSUMERS"].has(key)) this.io.to(roomId).emit(eventName, message.value); // TODO: add headers and dto schema
        else { };//TODO: cam_id doesn't exist in rooms so it should be deleted
      },
    }).then(_ => process.env["NODE_ENV"] === "development" ? console.log("Consumer", key, "connected!") : undefined);
    consumer.on("consumer.crash", (e: ConsumerCrashEvent) => {
      return this.deleteConsumer(key);
    });
    // consumer.on("consumer.stop")
    return consumer;
  };
  private async deleteConsumer(key: string) {
    const consumer = process["CONSUMERS"].get(key);
    await consumer?.disconnect().then((_: void) => process.env["NODE_ENV"] === "development" ? console.log("Consumer", key, "disconnected!") : undefined);
    return key;
  };
  private checkConsumersThread(): NodeJS.Timer {
    return setInterval(async () => {
      for (const key of process["CONSUMERS"].keys()) {
        if (process["CONSUMERS"].get(key) === undefined) return process["CONSUMERS"].set(key, await this.createConsumer(key));
        // some keys exist in consumers but their rooms have been deleted -> delete consumer too
        if (!process["CONSUMERS"].has(key)) return process["CONSUMERS"].delete(await this.deleteConsumer(key)); // old cameras in map
      };
    }, 1000);
  };
};


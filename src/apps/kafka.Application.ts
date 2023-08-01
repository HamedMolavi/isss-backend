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
      // if (key.startsWith("cam_")) {
      const consumer = await this.createConsumer(key);
      process["CONSUMERS"].set(key, consumer);
      // };
    };
    console.log("Initializing check thread");
    this.checkConsumersInterval = this.checkConsumersThread();
  };
  private async createConsumer(key: string) {
    const consumer = kafkaFactory({ clientId: key, type: "consumer" }) as Consumer; // TODO: when I place them in one group I get this error: The group is rebalancing, so a rejoin is needed 
    await consumer.subscribe({ topic: key, fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ topic, partition, message, heartbeat }) => { // heartbeat function to send manual heartbeat as messages recieved
        // console.log(topic, key, process["CONSUMERS"].has(key), message.offset);

        // console.log(message.headers);           //{}
        // console.log(message.timestamp);           //1690287272162
        // console.log(message.value);           //Buffer
        if (process["CONSUMERS"].has(key)) this.io.to(key as string).emit('stream', message.value);
        else { }//TODO: cam_id doesn't exist in rooms so it should be deleted

      },
    }).then(_ => process.env["NODE_ENV"] === "development" ? console.log("Consumer", key, "connected!") : undefined);
    consumer.on("consumer.crash", (e: ConsumerCrashEvent) => {
      console.error(e.payload.error);
      return this.deleteConsumer(key);
    })
    // consumer.on("consumer.stop")
    return consumer;
  };
  private async deleteConsumer(key: string) {
    const consumer = process["CONSUMERS"].get(key);
    await consumer.disconnect().then((_: undefined) => process.env["NODE_ENV"] === "development" ? console.log("Consumer", key, "disconnected!") : undefined);
    return key;
  };
  private checkConsumersThread(): NodeJS.Timer {
    return setInterval(async () => {
      for (const key of process["CONSUMERS"].keys()) {
        if (process["CONSUMERS"].get(key) === undefined) return process["CONSUMERS"].set(key, await this.createConsumer(key));
        // some keys exist in consumers but their rooms have been deleted -> delete consumer too
        if (!process["CONSUMERS"].has(key)) return process["CONSUMERS"].delete(await this.deleteConsumer(key)); // old cameras in map
      };
    }, 1000)
  };
};


import { Request, Response, NextFunction } from "express";
import { Kafka, Producer, logLevel } from "kafkajs";

export class SignalProducer {
  producer: Producer;
  constructor() {
    this.producer = new Kafka({
      logLevel: logLevel.ERROR,
      brokers: process.env["KAFKA_BOOTSTRAP"].split(","),
    }).producer({
      retry: {
        restartOnFailure: async (err) =>
          !Boolean(console.log("Kafka Connect Failure:", err)),
      },
      allowAutoTopicCreation: true,
    });
    this.producer.connect();
  }
  ////////////////////////////////////////////////////////////////////////////////
  async sendRestartSignal() {
    return this.producer.send({
      topic: process.env["SIGNAL_TOPIC"],
      messages: [
        {
          key: process.env["SIGNAL_KEY"],
          value: JSON.stringify({ signal: "restart", origin: "back", sender: "back" }),
        },
      ],
    })
      .then((data) => data[0])
      .catch((err) => console.log(err))
  }
  ////////////////////////////////////////////////////////////////////////////////
  async sendRestartSignalMiddleware(req: Request, res: Response, next: NextFunction) {
    let result = await this.sendRestartSignal();
    return res.json({
      success: !!result && !result.errorCode,
      data: !!result ? { "topic": result.topicName, "offset": result.baseOffset, "partition": result.partition } : {},
    })
  }
}
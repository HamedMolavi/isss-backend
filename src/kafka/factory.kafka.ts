import { Kafka, logLevel } from 'kafkajs';
import { KafkaClientType } from '../types/enums/kafka.enum';

// TODO: config?

export function kafkaFactory(
  options: {
    clientId: string,
    groupId: string ,
    type: KafkaClientType,
  }
) {
  const kafka = new Kafka({
    logLevel: process.env["NODE_ENV"] === "development" ? logLevel.ERROR : logLevel.NOTHING,
    brokers: [process.env["KAFKA_BOOTSTRAP"] as string],
    clientId: options.clientId,
    // ssl: {
    //   rejectUnauthorized: true
    // },
    // sasl: {
    //   mechanism: 'scram-sha-256',
    //   username: 'test',
    //   password: 'testtest',
    // },
  });
  if (options.type === undefined) return kafka;
  else {
    switch (options.type) {
      case "consumer":
        return kafka.consumer({
          groupId: options.groupId,
          retry: { restartOnFailure: async (err) => !Boolean(console.log("Kafka Connect Failure:", err)) },
          allowAutoTopicCreation: true, // TODO: should be false.
          readUncommitted: false
        });
      case "producer":
        return kafka.producer({
          retry: { restartOnFailure: async (err) => !Boolean(console.log("Kafka Connect Failure:", err)) },
          allowAutoTopicCreation: true, // TODO: should be false.
        });
      case "admin":
        return kafka.admin({
          retry: { restartOnFailure: async (err) => !Boolean(console.log("Kafka Connect Failure:", err)) },
        });
    };
  };
};

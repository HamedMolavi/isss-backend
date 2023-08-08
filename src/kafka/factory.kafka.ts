import { Kafka, logLevel, ConsumerConfig, ProducerConfig, AdminConfig, Consumer, Producer, Admin } from 'kafkajs';

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
    brokers: [`localhost:19092`],
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

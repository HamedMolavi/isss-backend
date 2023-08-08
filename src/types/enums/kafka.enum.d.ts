export { };

declare global {
  enum KafkaClientType {
    CONSUMER = "consumer",
    PRODUCER = "producer",
    ADMIN = "admin"
  };
};
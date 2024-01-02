import {
  Admin,
  Consumer,
  EachMessagePayload,
  Kafka,
  Producer,
  logLevel,
} from "kafkajs";

let producer = new Kafka({
  logLevel: logLevel.ERROR,
  brokers: process.env["KAFKA_BOOTSTRAP"].split(","),
}).producer({
  retry: {
    restartOnFailure: async (err) =>
      !Boolean(console.log("Kafka Connect Failure:", err)),
  },
  allowAutoTopicCreation: true,
});
producer.connect().then(_=>{
    const msg = Buffer.from(JSON.stringify({
        "personnel_id": "631731a1d2f90a9d4a49e65f",
        "face": "sadgfsdgsdfgsdgdsfg",
        "embedding": "",
        "has_face": "1",
        "timestamp": "2023-11-01T17:19:47.000Z"
    }), "utf8");
    producer.send({
      topic: "snapshot",
      messages: [{
        key:"soghra",
        value: msg
      }]
    })
})

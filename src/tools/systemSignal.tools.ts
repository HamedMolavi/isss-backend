import { Request, Response, NextFunction } from 'express';
import { Consumer, EachMessageHandler, Kafka, Producer, logLevel } from 'kafkajs';
import { randomUuid } from './utils.tools';

export class SignalProducer {
	producer: Producer;
	constructor() {
		this.producer = new Kafka({
			logLevel: logLevel.ERROR,
			brokers: process.env['KAFKA_BOOTSTRAP'].split(',')
		}).producer({
			retry: {
				restartOnFailure: async (err) => !Boolean(console.log('Kafka Connect Failure:', err))
			},
			allowAutoTopicCreation: true
		});
		this.producer.connect();
	}
	////////////////////////////////////////////////////////////////////////////////
	sendRestartSignal = async () => {
		SignalConsumer.restarted = false;
		return this.producer
			.send({
				topic: process.env['SIGNAL_TOPIC'],
				messages: [
					{
						key: 'connect',
						value: JSON.stringify({ signal: 'restart', origin: 'back', sender: 'back' })
					}
				]
			})
			.then((data) => data[0])
			.catch((err) => console.log(err));
	};
	////////////////////////////////////////////////////////////////////////////////
	sendRestartSignalMiddleware = async (req: Request, res: Response, next: NextFunction) => {
		let result = await this.sendRestartSignal();
		return res.json({
			success: !!result && !result.errorCode,
			data: !!result
				? { topic: result.topicName, offset: result.baseOffset, partition: result.partition }
				: {}
		});
	};
}

export class SignalConsumer {
	static consumer: Consumer = new Kafka({
		logLevel: logLevel.ERROR,
		brokers: process.env['KAFKA_BOOTSTRAP'].split(',')
	}).consumer({ groupId: randomUuid(5) });
	static restarted: boolean = false;

	constructor() {}
	////////////////////////////////////////////////////////////////////////////////
	static async setupDefault(topic: string = 'signal') {
		SignalConsumer.consumer.subscribe({ topic, fromBeginning: false }).then(() => {
			SignalConsumer.consumer.run({
				eachMessage: async ({ message }) => {
					let keyString = message.key?.toString('utf-8') ?? '';
					if (keyString !== 'back') return;
					let msgString = message.value?.toString('utf-8') ?? '{}';
					console.log('Signal msg:', msgString);
					let data;
					try {
						data = JSON.parse(msgString);
					} catch (error) {
						data = {};
					}
					switch (data.signal) {
						case 'restart': {
							console.log('Restart command running.');
							process.exit(0);
							return;
						}
						case 'done_restart': {
							console.log('Restart done successfully.');
							SignalConsumer.restarted = true;
							return;
						}
						default: {
							console.log('No command defined!');
						}
					}
				}
			});
		});
	}
	////////////////////////////////////////////////////////////////////////////////
	static async setupManual(eachMessage: EachMessageHandler, topic: string = 'signal') {
		SignalConsumer.consumer.subscribe({ topic, fromBeginning: false }).then(() => {
			SignalConsumer.consumer.run({ eachMessage });
		});
	}
}

export type DefaultEnv = {
	PORT_HTTP: string;
	PORT_HTTPS: string;
	HOST: string;
	BASE_URL: string;
	MONGODB_URL: string;
	REDIS_URL: string;
	SESSION_SECRET: string;
	ELASTIC_SEARCH: string;
	REQUEST_LOG_FORMAT: string;
	NODE_ENV: 'development' | 'production';
	REQUEST_LOG_DIR: string;
	RECORD_STREAM_TIME: string;
	MODELS: string;
	KAFKA_BOOTSTRAP: string;
	MAX_LOAD: string;
	SIGNAL_TOPIC: string;
	SIGNAL_KEY: string;
};

const defaults: DefaultEnv = {
	NODE_ENV: 'development',
	PORT_HTTP: '4000',
	PORT_HTTPS: '3000',
	HOST: '127.0.0.1',
	BASE_URL: '127.0.0.1:3000/api/v1',
	MONGODB_URL: 'mongodb://localhost:27017/test',
	REDIS_URL: 'redis://localhost:6379',
	ELASTIC_SEARCH: 'https://localhost:9200',
	REQUEST_LOG_FORMAT: '',
	REQUEST_LOG_DIR: './logs',
	RECORD_STREAM_TIME: '10',
	SESSION_SECRET: 'M<Y$N0A=MHEqIvS,D#E!V!M]OWL/AiV4i',
	MODELS: 'plate,human,face,sabotage,fire',
	KAFKA_BOOTSTRAP: 'localhost:9092',
	MAX_LOAD: '100',
	SIGNAL_TOPIC: 'signal',
	SIGNAL_KEY: 'connect'
};
export default defaults;

import { Client } from '@elastic/elasticsearch';

export {};
declare global {
	namespace NodeJS {
		interface Process {
			load: object & { [key: string]: object & { [key: string]: number } };
			esclient: Client;
		}
		interface ProcessEnv {
			MAX_CAMERAS: string;
			SIGNAL_TOPIC: string;
			SIGNAL_KEY: string;
			MAX_LOAD: string;
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
			WEB_STREAM: string;
			REQUEST_LOG_FILE: string;
			KAFKA_BOOTSTRAP: string;
			SAMPLE_STREAM_URI: string;
			WORD_BEFORE_REPLACE_STREAM: string;
			WORD_AFTER_REPLACE_STREAM: string;
			MODELS: string;
			LOG_COLLECTION_SIZE: string;
			SQLITE_PATH: string;
			MINIO_ROOT_USER: string;
			MINIO_ROOT_PASSWORD: string;
			MINIO_ENDPOINT: string;
		}
	}
	namespace Express {
		interface Request {
			loginRateLimit?: {
				username: string;
				ip: string;
			};
			loginFailed?: {
				error?: string;
				attemptedCredentials?: {
					username?: string;
					password?: string;
				};
			};
			loginFailureLogged?: boolean;
		}
		interface Response {
			responseBody?: unknown;
		}
	}

	namespace RestApi {
		interface ObjectResInterface {
			is_success: boolean;
			data?: unknown;
			msg?: string;
		}
	}
}

declare module 'express-session' {
	interface SessionData {
		captcha?: {
			id: string;
			hash: string;
			expiresAt: number;
		};
	}
}

declare module 'svg-captcha-fixed';

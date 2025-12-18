import crypto from 'crypto';
import svgCaptcha from 'svg-captcha-fixed';
import { RedisClientType, RedisDefaultModules, RedisFunctions, RedisScripts } from 'redis';
import connect from '../db/redis/connect.database';

type CaptchaRecord = {
	id: string;
	hash: string;
	expiresAt: number;
};

type CaptchaRedisClient = RedisClientType<RedisDefaultModules, RedisFunctions, RedisScripts>;

export type CaptchaConsumeResult = 'ok' | 'missing' | 'expired' | 'invalid';

class CaptchaService {
	private static readonly CAPTCHA_TTL_MS = 5 * 60 * 1000; // 5 minutes
	private static readonly CAPTCHA_REDIS_PREFIX = 'captcha:';

	private static client: CaptchaRedisClient | null = null;

	private static async getClient(): Promise<CaptchaRedisClient> {
		if (this.client) {
			return this.client;
		}
		const client = await connect(process.env['REDIS_URL'] || '');
		this.client = client as CaptchaRedisClient;
		return this.client;
	}

	private static hashCaptcha(value: string): string {
		return crypto.createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
	}

	private static buildRecord(text: string): CaptchaRecord {
		return {
			id: crypto.randomUUID(),
			hash: this.hashCaptcha(text),
			expiresAt: Date.now() + this.CAPTCHA_TTL_MS
		};
	}

	static async createCaptcha(): Promise<{ id: string; svg: string }> {
		const captcha = svgCaptcha.create({
			size: 5,
			noise: 3,
			color: true,
			background: '#f7f7f7',
			width: 180,
			height: 60,
			ignoreChars: '0Oo1Il'
		});

		const record = this.buildRecord(captcha.text);
		const client = await this.getClient();

		await client.set(`${this.CAPTCHA_REDIS_PREFIX}${record.id}`, JSON.stringify(record), {
			PX: this.CAPTCHA_TTL_MS
		});

		return {
			id: record.id,
			svg: captcha.data
		};
	}

	static async consumeCaptcha(captchaId: string, captchaValue: string): Promise<CaptchaConsumeResult> {
		const client = await this.getClient();
		const stored = await client.get(`${this.CAPTCHA_REDIS_PREFIX}${captchaId}`);

		if (!stored) {
			return 'missing';
		}

		let record: CaptchaRecord | null = null;
		try {
			record = JSON.parse(stored) as CaptchaRecord;
		} catch {
			record = null;
		}

		if (!record || record.expiresAt < Date.now()) {
			await client.del(`${this.CAPTCHA_REDIS_PREFIX}${captchaId}`);
			return 'expired';
		}

		const isMatchingId = record.id === captchaId;
		const isValidValue = record.hash === this.hashCaptcha(captchaValue);

		if (!isMatchingId || !isValidValue) {
			return 'invalid';
		}

		await client.del(`${this.CAPTCHA_REDIS_PREFIX}${captchaId}`);
		return 'ok';
	}
}

export default CaptchaService;

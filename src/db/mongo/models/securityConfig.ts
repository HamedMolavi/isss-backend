import { Schema, model } from 'mongoose';
import { ISecurityConfig } from '../../../types/interfaces/securityConfig.interface';

const SecurityConfigSchema = new Schema<ISecurityConfig>(
	{
		maxConcurrentSessions: {
			type: Number,
			required: true,
			default: 5
		},
		passwordRequirements: [
			{
				re: {
					type: String,
					required: true
				},
				label: {
					type: String,
					required: true
				}
			}
		],
		logBackup: {
			checkIntervalHours: {
				type: Number,
				required: true,
				default: 24
			},
			checkIntervalMs: {
				type: Number,
				required: true,
				default: 24 * 60 * 60 * 1000
			},
			ttlDays: {
				type: Number,
				required: true,
				default: 60
			},
			defaultConfig: {
				ttlDays: {
					type: Number,
					required: true,
					default: 60
				},
				isAutoBackup: {
					type: Boolean,
					required: true,
					default: true
				}
			}
		},
		loginRateLimit: {
			maxAttempts: {
				type: Number,
				required: true,
				default: 5
			},
			blockDurationMinutes: {
				type: Number,
				required: true,
				default: 30
			},
			windowMinutes: {
				type: Number,
				required: true,
				default: 15
			},
			historyRetentionDays: {
				type: Number,
				required: true,
				default: 7
			}
		},
		session: {
			timeout: {
				type: Number,
				required: true,
				default: 30 * 60 * 1000
			}
		}
	},
	{ timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } }
);

export const SecurityConfig = model<ISecurityConfig>('SecurityConfig', SecurityConfigSchema);

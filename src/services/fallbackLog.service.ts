import { readFile } from 'fs/promises';
import { FALLBACK_LOG_PATH } from '../logger/transports';

export type FallbackLogRecord = {
	_id?: string | { toString(): string };
	level?: string;
	timestamp?: string | Date;
	created_at?: string | Date;
	message?: string;
	action?: string;
	metadata?: Record<string, unknown>;
	[key: string]: unknown;
};

/**
 * Reads both the active journal and a journal currently being replayed.
 * A partially appended final line is ignored and will be available on the
 * next request after its write completes.
 */
export async function readFallbackLogs(): Promise<FallbackLogRecord[]> {
	const paths = [FALLBACK_LOG_PATH, `${FALLBACK_LOG_PATH}.replaying`];
	const records = new Map<string, FallbackLogRecord>();

	for (const filePath of paths) {
		let content: string;
		try {
			content = await readFile(filePath, 'utf8');
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
				console.error(`Failed to read fallback logs from ${filePath}:`, error);
			}
			continue;
		}

		for (const [index, line] of content.split(/\r?\n/).entries()) {
			if (!line.trim()) continue;
			try {
				const record = JSON.parse(line) as FallbackLogRecord;
				if (!record || typeof record !== 'object') continue;
				const id = record._id?.toString() || `${filePath}:${index}`;
				records.set(id, record);
			} catch {
				// The writer may still be completing the final JSONL line. Do not make
				// the entire logs endpoint fail because of one incomplete record.
			}
		}
	}

	return [...records.values()];
}

export function normalizeAccessLevelName(value: unknown): string {
	if (typeof value !== 'string') return '';

	return value.replace(/[\u200b-\u200f\uFEFF]/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildAccessLevelNameQuery(name: unknown, options?: { excludeId?: string }) {
	const normalizedName = normalizeAccessLevelName(name);
	const query: Record<string, unknown> = {
		name: { $regex: `^${normalizedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }
	};

	if (options?.excludeId) {
		query['_id'] = { $ne: options.excludeId };
	}

	return query;
}

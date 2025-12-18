/**
 * Log Formatter Utility
 * Transforms raw log data into human-readable format for frontend display
 */

/**
 * Action type mappings for human-readable display
 */
export const ACTION_LABELS: Record<string, string> = {
	// Authentication events
	login_success: 'ورود موفق',
	login_failed: 'ورود ناموفق',
	login_error: 'خطا در ورود',
	login_blocked: 'مسدود شدن ورود',
	logout: 'خروج از سیستم',
	session_expired: 'انقضای نشست',
	session_terminated: 'پایان نشست توسط مدیر',
	unauthorized_access: 'دسترسی غیرمجاز',

	// OTP events
	otp_generated: 'تولید کد OTP',
	otp_enabled: 'فعال‌سازی OTP',
	otp_disabled: 'غیرفعال‌سازی OTP',
	otp_verification_failed: 'تأیید ناموفق OTP',

	// IP restriction events
	ip_restriction_enabled: 'فعال‌سازی محدودیت IP',
	ip_restriction_disabled: 'غیرفعال‌سازی محدودیت IP',
	ip_added: 'افزودن IP مجاز',
	ip_removed: 'حذف IP مجاز',
	ip_access_denied: 'دسترسی IP رد شد',

	// User management events
	user_created: 'ایجاد کاربر جدید',
	user_create_failed: 'ایجاد کاربر ناموفق',
	user_updated: 'به‌روزرسانی کاربر',
	user_update_failed: 'به‌روزرسانی کاربر ناموفق',
	user_deleted: 'حذف کاربر',
	user_delete_failed: 'حذف کاربر ناموفق',
	user_activated: 'فعال‌سازی کاربر',
	user_deactivated: 'غیرفعال‌سازی کاربر',
	password_changed: 'تغییر رمز عبور',
	password_reset: 'بازنشانی رمز عبور',
	password_updated: 'به‌روزرسانی رمز عبور',
	password_update_failed: 'خطا در به‌روزرسانی رمز عبور',
	password_reset_by_admin: 'بازنشانی رمز توسط مدیر',
	password_change_required: 'اجبار به تغییر رمز عبور',
	password_change_completed: 'تکمیل تغییر رمز عبور',
	role_assigned: 'تغییر نقش کاربر',
	role_assignment_failed: 'خطا در تغییر نقش',
	access_level_assigned: 'تغییر سطح دسترسی',
	access_level_assignment_failed: 'خطا در تغییر سطح دسترسی',
	permission_check_success: 'موفقیت در بررسی مجوز',
	permission_check_failed: 'عدم موفقیت در بررسی مجوز',

	// System events
	system_operation: 'عملیات سیستمی',
	config_changed: 'تغییر تنظیمات',
	backup_created: 'ایجاد پشتیبان',
	backup_restored: 'بازیابی پشتیبان',
	backup_deleted: 'حذف پشتیبان',

	// Data events
	data_created: 'ایجاد داده',
	data_updated: 'به‌روزرسانی داده',
	data_deleted: 'حذف داده',
	data_exported: 'صادرات داده',
	data_imported: 'واردات داده',

	// Request events
	get_request: 'درخواست GET',
	post_request: 'درخواست POST',
	put_request: 'درخواست PUT',
	patch_request: 'درخواست PATCH',
	delete_request: 'درخواست DELETE',

	// Log access events
	logs_list: 'مشاهده لاگ‌ها',
	log_read: 'مشاهده لاگ',
	auth_history_view: 'مشاهده تاریخچه احراز هویت',
	auth_summary_view: 'مشاهده خلاصه احراز هویت',

	// Access level events
	access_level_created: 'ایجاد سطح دسترسی',
	access_level_updated: 'به‌روزرسانی سطح دسترسی',
	access_level_deleted: 'حذف سطح دسترسی',

	// Camera events
	camera_created: 'افزودن دوربین',
	camera_updated: 'به‌روزرسانی دوربین',
	camera_deleted: 'حذف دوربین',

	// Personnel events
	personnel_created: 'افزودن پرسنل',
	personnel_updated: 'به‌روزرسانی پرسنل',
	personnel_deleted: 'حذف پرسنل'
};

/**
 * Log level labels
 */
export const LEVEL_LABELS: Record<string, string> = {
	error: 'خطا',
	warn: 'هشدار',
	info: 'اطلاعات',
	http: 'HTTP',
	verbose: 'مفصل',
	debug: 'اشکال‌زدایی',
	silly: 'جزئیات'
};

/**
 * Log level colors/severity for UI
 */
export const LEVEL_SEVERITY: Record<string, { color: string; priority: number }> = {
	error: { color: 'red', priority: 1 },
	warn: { color: 'orange', priority: 2 },
	info: { color: 'blue', priority: 3 },
	http: { color: 'green', priority: 4 },
	verbose: { color: 'gray', priority: 5 },
	debug: { color: 'purple', priority: 6 },
	silly: { color: 'lightgray', priority: 7 }
};

/**
 * HTTP Method labels and colors
 */
export const HTTP_METHOD_INFO: Record<string, { label: string; color: string }> = {
	GET: { label: 'دریافت', color: 'green' },
	POST: { label: 'ایجاد', color: 'blue' },
	PUT: { label: 'به‌روزرسانی', color: 'orange' },
	DELETE: { label: 'حذف', color: 'red' }
};

/**
 * HTTP Status code categories and labels
 */
export const HTTP_STATUS_INFO: Record<string, { label: string; color: string }> = {
	'2xx': { label: 'موفق', color: 'green' },
	'3xx': { label: 'تغییر مسیر', color: 'blue' },
	'4xx': { label: 'خطای کلاینت', color: 'orange' },
	'5xx': { label: 'خطای سرور', color: 'red' }
};

/**
 * Resource labels for URL paths
 */
export const RESOURCE_LABELS: Record<string, string> = {
	auth: 'احراز هویت',
	login: 'ورود',
	logout: 'خروج',
	users: 'کاربران',
	user: 'کاربر',
	config: 'تنظیمات',
	logs: 'لاگ‌ها',
	sessions: 'نشست‌ها',
	cameras: 'دوربین‌ها',
	camera: 'دوربین',
	personnel: 'پرسنل',
	report: 'گزارش',
	reports: 'گزارش‌ها',
	backup: 'پشتیبان',
	system: 'سیستم',
	security: 'امنیت',
	otp: 'رمز یکبار مصرف',
	'access-levels': 'سطوح دسترسی',
	accessLevels: 'سطوح دسترسی',
	file: 'فایل',
	snapshot: 'تصویر لحظه‌ای',
	password: 'رمز عبور',
	ip: 'آدرس IP'
};

/**
 * Action categories for grouping
 */
export const ACTION_CATEGORIES: Record<string, string[]> = {
	authentication: [
		'login_success',
		'login_failed',
		'login_error',
		'logout',
		'session_expired',
		'session_terminated',
		'unauthorized_access',
		'auth_history_view',
		'auth_summary_view'
	],
	otp: ['otp_generated', 'otp_enabled', 'otp_disabled', 'otp_verification_failed'],
	ip_restriction: [
		'ip_restriction_enabled',
		'ip_restriction_disabled',
		'ip_added',
		'ip_removed',
		'ip_access_denied'
	],
	user_management: [
		'user_created',
		'user_create_failed',
		'user_updated',
		'user_update_failed',
		'user_deleted',
		'user_delete_failed',
		'user_activated',
		'user_deactivated',
		'password_changed',
		'password_reset',
		'role_assigned',
		'role_assignment_failed',
		'access_level_assigned',
		'access_level_assignment_failed',
		'permission_check_success',
		'permission_check_failed',
		'password_updated',
		'password_update_failed',
		'password_reset_by_admin',
		'password_change_required',
		'password_change_completed'
	],
	system: [
		'system_operation',
		'config_changed',
		'backup_created',
		'backup_restored',
		'backup_deleted',
		'logs_list',
		'log_read'
	],
	data: ['data_created', 'data_updated', 'data_deleted', 'data_exported', 'data_imported'],
	access_level: ['access_level_created', 'access_level_updated', 'access_level_deleted'],
	camera: ['camera_created', 'camera_updated', 'camera_deleted'],
	personnel: ['personnel_created', 'personnel_updated', 'personnel_deleted'],
	http_request: [] // Will be dynamically populated
};

/**
 * Category labels
 */
export const CATEGORY_LABELS: Record<string, string> = {
	authentication: 'احراز هویت',
	otp: 'رمز یکبار مصرف',
	ip_restriction: 'محدودیت IP',
	user_management: 'مدیریت کاربران',
	system: 'سیستم',
	data: 'داده‌ها',
	access_level: 'سطح دسترسی',
	camera: 'دوربین‌ها',
	personnel: 'پرسنل',
	http_request: 'درخواست HTTP',
	other: 'سایر'
};

/**
 * Raw log interface from database
 */
interface RawLog {
	_id: string;
	level: string;
	timestamp: Date;
	message: string;
	action: string;
	metadata?: {
		type?: string;
		ip?: string;
		username?: string;
		userid?: string;
		userId?: string;
		success?: boolean;
		userAgent?: string;
		details?: Record<string, unknown>;
		method?: string;
		url?: string;
		duration?: number;
		statusCode?: number;
		[key: string]: unknown;
	};
	created_at?: Date;
	updated_at?: Date;
}

/**
 * HTTP request info for formatted logs
 */
export interface HttpRequestInfo {
	method: string;
	methodLabel: string;
	url: string;
	resource: string;
	statusCode: number;
	statusLabel: string;
	statusColor: string;
	duration: number | null;
	durationLabel: string;
}

/**
 * Formatted log interface for frontend
 */
export interface FormattedLog {
	id: string;
	timestamp: string;
	timestampRelative: string;
	level: {
		value: string;
		label: string;
		color: string;
		priority: number;
	};
	action: {
		value: string;
		label: string;
		category: string;
		categoryLabel: string;
	};
	user: {
		username: string;
		id: string;
	};
	location: {
		ip: string;
		userAgent: string;
	};
	request: HttpRequestInfo | null;
	message: string;
	summary: string;
	success: boolean | null;
	details: Record<string, unknown> | null;
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
function getRelativeTime(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSecs = Math.floor(diffMs / 1000);
	const diffMins = Math.floor(diffSecs / 60);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSecs < 60) return 'همین الان';
	if (diffMins < 60) return `${diffMins} دقیقه پیش`;
	if (diffHours < 24) return `${diffHours} ساعت پیش`;
	if (diffDays < 7) return `${diffDays} روز پیش`;
	if (diffDays < 30) return `${Math.floor(diffDays / 7)} هفته پیش`;
	return `${Math.floor(diffDays / 30)} ماه پیش`;
}

/**
 * Get action category
 */
export function getActionCategory(action: string): string {
	for (const [category, actions] of Object.entries(ACTION_CATEGORIES)) {
		if (actions.includes(action)) {
			return category;
		}
	}
	return 'other';
}

/**
 * Extract resource name from URL
 */
function getResourceFromUrl(url: string): string {
	if (!url) return '';

	// Remove query string
	const path = url.split('?')[0];
	// Get path segments
	const segments = path.split('/').filter((s) => s && !s.match(/^[0-9a-fA-F]{24}$/)); // Filter out MongoDB IDs

	// Find meaningful resource name
	for (const segment of segments.reverse()) {
		if (RESOURCE_LABELS[segment]) {
			return RESOURCE_LABELS[segment];
		}
	}

	// Return last non-id segment
	const lastSegment = segments[segments.length - 1] || '';
	return RESOURCE_LABELS[lastSegment] || lastSegment || 'منبع ناشناخته';
}

/**
 * Get status info based on status code
 */
function getStatusInfo(statusCode: number): { label: string; color: string } {
	if (statusCode >= 200 && statusCode < 300) {
		return HTTP_STATUS_INFO['2xx'];
	}
	if (statusCode >= 300 && statusCode < 400) {
		return HTTP_STATUS_INFO['3xx'];
	}
	if (statusCode >= 400 && statusCode < 500) {
		return HTTP_STATUS_INFO['4xx'];
	}
	if (statusCode >= 500) {
		return HTTP_STATUS_INFO['5xx'];
	}
	return { label: 'نامشخص', color: 'gray' };
}

/**
 * Format duration for display
 */
function formatDuration(ms: number | null | undefined): string {
	if (ms === null || ms === undefined) return 'نامشخص';
	if (ms < 1000) return `${ms} میلی‌ثانیه`;
	if (ms < 60000) return `${(ms / 1000).toFixed(1)} ثانیه`;
	return `${(ms / 60000).toFixed(1)} دقیقه`;
}

/**
 * Generate a human-readable summary from log data
 */
function generateSummary(log: RawLog): string {
	const action = log.action || '';
	const username = log.metadata?.username || 'کاربر ناشناس';
	const ip = log.metadata?.ip || '';
	const success = log.metadata?.success;

	// Check if this is an HTTP request log
	const method = log.metadata?.method || log.metadata?.httpMethod;
	const url = log.metadata?.url || log.metadata?.path || log.metadata?.originalUrl;
	const statusCode = (log.metadata?.statusCode || log.metadata?.status) as number | undefined;

	if (method && url) {
		const methodUpper = String(method).toUpperCase();
		const methodInfo = HTTP_METHOD_INFO[methodUpper] || { label: methodUpper, color: 'gray' };
		const resource = getResourceFromUrl(String(url));
		const statusInfo = statusCode ? getStatusInfo(Number(statusCode)) : null;
		const duration = (log.metadata?.responseTime || log.metadata?.duration) as number | undefined;
		const durationText = duration ? ` (${formatDuration(Number(duration))})` : '';

		if (statusCode) {
			return `${methodInfo.label} ${resource} - ${statusCode} ${statusInfo?.label}${durationText}`;
		}
		return `${methodInfo.label} ${resource}${durationText}`;
	}

	// Authentication summaries
	if (action === 'login_success') {
		return `${username} با موفقیت وارد شد${ip ? ` از ${ip}` : ''}`;
	}
	if (action === 'login_failed') {
		return `تلاش ناموفق ورود برای ${username}${ip ? ` از ${ip}` : ''}`;
	}
	if (action === 'logout') {
		return `${username} از سیستم خارج شد`;
	}
	if (action === 'session_expired') {
		return `نشست ${username} منقضی شد`;
	}
	if (action === 'unauthorized_access') {
		return `دسترسی غیرمجاز توسط ${username}${ip ? ` از ${ip}` : ''}`;
	}

	// User management summaries
	if (action === 'user_created') {
		const targetUser = log.metadata?.details?.username || 'کاربر جدید';
		return `${username} کاربر ${targetUser} را ایجاد کرد`;
	}
	if (action === 'user_updated') {
		const targetUser = log.metadata?.details?.username || 'کاربر';
		return `${username} اطلاعات ${targetUser} را به‌روزرسانی کرد`;
	}
	if (action === 'user_deleted') {
		const targetUser = log.metadata?.details?.username || 'کاربر';
		return `${username} کاربر ${targetUser} را حذف کرد`;
	}
	if (action === 'password_changed') {
		return `${username} رمز عبور خود را تغییر داد`;
	}

	// IP restriction summaries
	if (action === 'ip_added') {
		const addedIP = log.metadata?.details?.addedIP || 'IP';
		return `${username} آدرس ${addedIP} را به لیست مجاز اضافه کرد`;
	}
	if (action === 'ip_removed') {
		const removedIP = log.metadata?.details?.removedIP || 'IP';
		return `${username} آدرس ${removedIP} را از لیست مجاز حذف کرد`;
	}
	if (action === 'ip_access_denied') {
		return `دسترسی از ${ip} برای ${username} رد شد`;
	}

	// OTP summaries
	if (action === 'otp_enabled') {
		return `${username} احراز هویت دو مرحله‌ای را فعال کرد`;
	}
	if (action === 'otp_disabled') {
		return `${username} احراز هویت دو مرحله‌ای را غیرفعال کرد`;
	}

	// Default summary
	const actionLabel = ACTION_LABELS[action] || action;
	const successText = success === true ? ' (موفق)' : success === false ? ' (ناموفق)' : '';
	return `${actionLabel} توسط ${username}${successText}`;
}

/**
 * Extract HTTP request info from log metadata
 */
function extractHttpRequestInfo(log: RawLog): HttpRequestInfo | null {
	const metadata = log.metadata;
	if (!metadata) return null;

	// Check if this is an HTTP log
	const method = metadata.method || metadata.httpMethod;
	const url = metadata.url || metadata.path || metadata.originalUrl;

	if (!method || !url) return null;

	const methodUpper = String(method).toUpperCase();
	const methodInfo = HTTP_METHOD_INFO[methodUpper] || { label: methodUpper, color: 'gray' };
	const statusCode = Number(metadata.statusCode || metadata.status || 0);
	const statusInfo = getStatusInfo(statusCode);
	const duration = (metadata.responseTime || metadata.duration) as number | undefined;

	return {
		method: methodUpper,
		methodLabel: methodInfo.label,
		url: String(url),
		resource: getResourceFromUrl(String(url)),
		statusCode: statusCode,
		statusLabel: statusInfo.label,
		statusColor: statusInfo.color,
		duration: duration !== undefined ? Number(duration) : null,
		durationLabel: formatDuration(duration !== undefined ? Number(duration) : null)
	};
}

/**
 * Format a single log entry for frontend display
 */
export function formatLog(log: RawLog): FormattedLog {
	const timestamp = new Date(log.timestamp || log.created_at || new Date());
	const action = log.action || 'unknown';
	const level = log.level || 'info';
	const category = getActionCategory(action);
	const levelInfo = LEVEL_SEVERITY[level] || { color: 'gray', priority: 99 };
	const httpRequestInfo = extractHttpRequestInfo(log);

	// Provide a non-null request object when partial HTTP metadata exists
	const requestInfo =
		httpRequestInfo ||
		(() => {
			const method = (log.metadata?.method || log.metadata?.httpMethod || '').toString().toUpperCase();
			const url = (log.metadata?.url || log.metadata?.path || log.metadata?.originalUrl || '').toString();
			const statusCode = Number(log.metadata?.statusCode || log.metadata?.status || 0);
			const statusInfo = getStatusInfo(statusCode);
			const durationRaw = log.metadata?.responseTime || log.metadata?.duration;
			const duration = durationRaw !== undefined ? Number(durationRaw) : null;

			// If we truly have no HTTP-ish data, keep it null
			if (!method && !url && duration === null && !statusCode) return null;

			const methodInfo = method ? HTTP_METHOD_INFO[method] || { label: method, color: 'gray' } : null;

			return {
				method,
				methodLabel: methodInfo?.label || '',
				url,
				resource: getResourceFromUrl(url || ''),
				statusCode,
				statusLabel: statusInfo.label,
				statusColor: statusInfo.color,
				duration,
				durationLabel: formatDuration(duration)
			};
		})();

	return {
		id: log._id?.toString() || '',
		timestamp: timestamp.toISOString(),
		timestampRelative: getRelativeTime(timestamp),
		level: {
			value: level,
			label: LEVEL_LABELS[level] || level,
			color: levelInfo.color,
			priority: levelInfo.priority
		},
		action: {
			value: action,
			label: ACTION_LABELS[action] || action,
			category,
			categoryLabel: CATEGORY_LABELS[category] || 'سایر'
		},
		user: {
			username: log.metadata?.username || 'unknown',
			id: log.metadata?.userid || log.metadata?.userId || ''
		},
		location: {
			ip: log.metadata?.ip || '',
			userAgent: simplifyUserAgent(log.metadata?.userAgent || '')
		},
		request: requestInfo,
		message: log.message || '',
		summary: generateSummary(log),
		success: log.metadata?.success ?? null,
		details: cleanDetails(log.metadata?.details || null)
	};
}

/**
 * Simplify user agent string
 */
function simplifyUserAgent(userAgent: string): string {
	if (!userAgent) return '';

	// Extract browser name and OS
	const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera|MSIE|Trident)/i);
	const osMatch = userAgent.match(/(Windows|Mac|Linux|Android|iOS|iPhone|iPad)/i);

	const browser = browserMatch ? browserMatch[1] : 'Unknown Browser';
	const os = osMatch ? osMatch[1] : 'Unknown OS';

	return `${browser} on ${os}`;
}

/**
 * Parse user agent string into detailed object
 */
export interface ParsedUserAgent {
	raw: string;
	browser: {
		name: string;
		nameLabel: string;
		version: string;
	};
	os: {
		name: string;
		nameLabel: string;
		version: string;
	};
	device: {
		type: 'desktop' | 'mobile' | 'tablet' | 'unknown';
		typeLabel: string;
	};
	summary: string;
}

const BROWSER_LABELS: Record<string, string> = {
	Chrome: 'کروم',
	Firefox: 'فایرفاکس',
	Safari: 'سافاری',
	Edge: 'اِج',
	Opera: 'اپرا',
	IE: 'اینترنت اکسپلورر',
	Samsung: 'سامسونگ',
	Unknown: 'ناشناخته'
};

const OS_LABELS: Record<string, string> = {
	Windows: 'ویندوز',
	'Mac OS': 'مک',
	macOS: 'مک',
	Linux: 'لینوکس',
	Android: 'اندروید',
	iOS: 'آی‌او‌اس',
	Unknown: 'ناشناخته'
};

const DEVICE_TYPE_LABELS: Record<string, string> = {
	desktop: 'رایانه',
	mobile: 'موبایل',
	tablet: 'تبلت',
	unknown: 'ناشناخته'
};

export function parseUserAgent(userAgent: string): ParsedUserAgent {
	if (!userAgent) {
		return {
			raw: '',
			browser: { name: 'Unknown', nameLabel: 'ناشناخته', version: '' },
			os: { name: 'Unknown', nameLabel: 'ناشناخته', version: '' },
			device: { type: 'unknown', typeLabel: 'ناشناخته' },
			summary: 'مرورگر ناشناخته'
		};
	}

	// Extract browser info
	let browserName = 'Unknown';
	let browserVersion = '';

	if (userAgent.includes('Edg/')) {
		browserName = 'Edge';
		const match = userAgent.match(/Edg\/([\d.]+)/);
		browserVersion = match ? match[1] : '';
	} else if (userAgent.includes('OPR/') || userAgent.includes('Opera')) {
		browserName = 'Opera';
		const match = userAgent.match(/OPR\/([\d.]+)/) || userAgent.match(/Opera\/([\d.]+)/);
		browserVersion = match ? match[1] : '';
	} else if (userAgent.includes('Chrome/')) {
		browserName = 'Chrome';
		const match = userAgent.match(/Chrome\/([\d.]+)/);
		browserVersion = match ? match[1] : '';
	} else if (userAgent.includes('Firefox/')) {
		browserName = 'Firefox';
		const match = userAgent.match(/Firefox\/([\d.]+)/);
		browserVersion = match ? match[1] : '';
	} else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
		browserName = 'Safari';
		const match = userAgent.match(/Version\/([\d.]+)/);
		browserVersion = match ? match[1] : '';
	} else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
		browserName = 'IE';
		const match = userAgent.match(/MSIE ([\d.]+)/) || userAgent.match(/rv:([\d.]+)/);
		browserVersion = match ? match[1] : '';
	} else if (userAgent.includes('SamsungBrowser')) {
		browserName = 'Samsung';
		const match = userAgent.match(/SamsungBrowser\/([\d.]+)/);
		browserVersion = match ? match[1] : '';
	}

	// Extract OS info
	let osName = 'Unknown';
	let osVersion = '';

	if (userAgent.includes('Windows NT')) {
		osName = 'Windows';
		const match = userAgent.match(/Windows NT ([\d.]+)/);
		if (match) {
			const ntVersion = match[1];
			const windowsVersions: Record<string, string> = {
				'10.0': '10/11',
				'6.3': '8.1',
				'6.2': '8',
				'6.1': '7',
				'6.0': 'Vista',
				'5.1': 'XP'
			};
			osVersion = windowsVersions[ntVersion] || ntVersion;
		}
	} else if (userAgent.includes('Mac OS X')) {
		osName = 'Mac OS';
		const match = userAgent.match(/Mac OS X ([\d_.]+)/);
		osVersion = match ? match[1].replace(/_/g, '.') : '';
	} else if (userAgent.includes('Android')) {
		osName = 'Android';
		const match = userAgent.match(/Android ([\d.]+)/);
		osVersion = match ? match[1] : '';
	} else if (userAgent.includes('iPhone') || userAgent.includes('iPad') || userAgent.includes('iPod')) {
		osName = 'iOS';
		const match = userAgent.match(/OS ([\d_]+)/);
		osVersion = match ? match[1].replace(/_/g, '.') : '';
	} else if (userAgent.includes('Linux')) {
		osName = 'Linux';
	}

	// Determine device type
	let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
	if (userAgent.includes('Mobile') || (userAgent.includes('Android') && !userAgent.includes('Tablet'))) {
		deviceType = 'mobile';
	} else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
		deviceType = 'tablet';
	} else if (userAgent.includes('Windows') || userAgent.includes('Mac OS') || userAgent.includes('Linux')) {
		deviceType = 'desktop';
	}

	const browserLabel = BROWSER_LABELS[browserName] || browserName;
	const osLabel = OS_LABELS[osName] || osName;
	const deviceLabel = DEVICE_TYPE_LABELS[deviceType];

	// Build summary
	const versionPart = browserVersion ? ` ${browserVersion.split('.')[0]}` : '';
	const osPart = osVersion ? ` ${osVersion}` : '';
	const summary = `${browserLabel}${versionPart} روی ${osLabel}${osPart}`;

	return {
		raw: userAgent,
		browser: {
			name: browserName,
			nameLabel: browserLabel,
			version: browserVersion
		},
		os: {
			name: osName,
			nameLabel: osLabel,
			version: osVersion
		},
		device: {
			type: deviceType,
			typeLabel: deviceLabel
		},
		summary
	};
}

/**
 * Clean and simplify details object
 */
function cleanDetails(details: Record<string, unknown> | null): Record<string, unknown> | null {
	if (!details) return null;

	const cleaned: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(details)) {
		// Skip internal/system keys
		if (key.startsWith('_') || key === 'headers' || key === 'stack') {
			continue;
		}

		// Simplify nested objects
		if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
			const nested = cleanDetails(value as Record<string, unknown>);
			if (nested && Object.keys(nested).length > 0) {
				cleaned[key] = nested;
			}
		} else if (value !== undefined && value !== null && value !== '') {
			cleaned[key] = value;
		}
	}

	return Object.keys(cleaned).length > 0 ? cleaned : null;
}

/**
 * Format multiple logs
 */
export function formatLogs(logs: RawLog[]): FormattedLog[] {
	return logs.map(formatLog);
}

/**
 * Get all action options for filtering
 */
export function getActionOptions(): Array<{ value: string; label: string; category: string }> {
	const options: Array<{ value: string; label: string; category: string }> = [];

	for (const [action, label] of Object.entries(ACTION_LABELS)) {
		const category = getActionCategory(action);
		options.push({
			value: action,
			label,
			category: CATEGORY_LABELS[category] || 'سایر'
		});
	}

	return options.sort((a, b) => a.category.localeCompare(b.category));
}

/**
 * Get category options for filtering
 */
export function getCategoryOptions(): Array<{ value: string; label: string; count: number }> {
	return Object.entries(CATEGORY_LABELS).map(([value, label]) => ({
		value,
		label,
		count: ACTION_CATEGORIES[value]?.length || 0
	}));
}

/**
 * Get level options for filtering
 */
export function getLevelOptions(): Array<{ value: string; label: string; color: string }> {
	return Object.entries(LEVEL_LABELS).map(([value, label]) => ({
		value,
		label,
		color: LEVEL_SEVERITY[value]?.color || 'gray'
	}));
}

/**
 * Get HTTP method options for filtering
 */
export function getHttpMethodOptions(): Array<{ value: string; label: string; color: string }> {
	return Object.entries(HTTP_METHOD_INFO).map(([value, info]) => ({
		value,
		label: info.label,
		color: info.color
	}));
}

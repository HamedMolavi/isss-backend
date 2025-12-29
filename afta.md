# افتا - لیست کارها (AFTA To-Do List)

---

## 🔴 اولویت بالا - امنیت سرور و شبکه

- [x] **حذف X-Powered-By Header**
  - پیاده‌سازی: `security.middleware.ts` - حذف هدرهای حساس
  - استفاده از Helmet در `app.Application.ts`
  - هدرهای حذف شده: `X-Powered-By`, `Server`, `X-AspNet-Version`

---

## 🔴 اولویت بالا - احراز هویت و امنیت ورود

- [x] **پیاده‌سازی CAPTCHA**
  - در صفحه لاگین محصول از کپچا استفاده نشده است

- [x] **مکانیزم قفل حساب کاربری**
  - پیاده‌سازی: `login-rate-limit.middleware.ts`
  - تنظیمات: `MAX_ATTEMPTS: 5`, `BLOCK_DURATION_MINUTES: 30`
  - ذخیره‌سازی در Redis برای پایداری

- [x] **جلوگیری از Brute Force**
  - پیاده‌سازی: `LoginRateLimiter` + `ResourceRateLimiter`
  - محدودیت بر اساس IP و Username
  - تاریخچه تلاش‌ها در Redis ذخیره می‌شود

- [x] **یکسان‌سازی پیام‌های خطا (User Enumeration)**
  - پیاده‌سازی: پیام یکسان `Invalid credentials` برای همه خطاها
  - `authorize.auth.ts` و `login-rate-limit.middleware.ts`
  - کد وضعیت 401 برای همه حالات ناموفق

- [x] **اعتبارسنجی ورودی لاگین**
  - پیاده‌سازی: `LoginBodyDto` در `login.dto.ts`
  - اعتبارسنجی: `@MinLength`, `@MaxLength`, `@IsDefined`
  - حداکثر 100 کاراکتر برای username، 128 برای password

- [x] **اعتبارسنجی طول رمز عبور**
  - پیاده‌سازی: `passwordValidator` در `validation/password/index.ts`
  - حداقل 8 کاراکتر (قابل تنظیم در SecurityConfig)
  - الزامات: عدد، حروف کوچک/بزرگ، کاراکتر خاص

- [x] **اجبار تغییر رمز عبور پس از تنظیم توسط ادمین**
  - پس از تنظیم کلمه‌عبور توسط ادمین، کاربر ملزم به تغییر است
  - فیلد `must_change_password` به مدل کاربر اضافه شد
  - در زمان لاگین، کلاینت از این فیلد مطلع می‌شود

- [x] **رفع مشکل تغییر رمز عبور**
  - Endpoint: `PATCH /api/v1/config/users/password`
  - اعتبارسنجی رمز فعلی و جدید
  - خاتمه سایر نشست‌ها پس از تغییر

- [x] **رفع مشکل سرویس OTP**
  - Endpoints: `POST /api/v1/auth/otp/generate`, `/enable`, `/disable`, `/validate`
  - پیاده‌سازی: `otp.service.ts` با کتابخانه `otplib`
  - QR Code برای اتصال به Google Authenticator

---

## 🔴 اولویت بالا - کنترل دسترسی

- [x] **محدودسازی منوها برای کاربر عادی**
  - پیاده‌سازی: `accessCheck.auth.ts` - کنترل دسترسی بر اساس AccessLevel
  - Model: `AccessLevel` با فیلد `permissions`
  - Middleware: بررسی `user.access_level.permissions` برای هر endpoint

- [x] **جلوگیری از حذف حساب ادمین توسط خودش**
  - پیاده‌سازی: `user.controller.ts` - `deleteUser`
  - بررسی: `if (req.user._id === userId) throw ForbiddenError`
  - پاسخ 403 Forbidden برای حذف خود

- [x] **رفع مشکل ساخت کاربر**
  - Endpoint: `POST /api/v1/config/users`
  - پیاده‌سازی: `user.controller.ts` - `createUser`
  - اعتبارسنجی: `CreateUserDto` با `access_level` الزامی

- [x] **دسترسی بدون احراز هویت**
  - پیاده‌سازی: `passport.authenticate('session')` در همه routeها
  - Middleware: `isAuthenticated` بررسی `req.isAuthenticated()`
  - پاسخ 401 Unauthorized برای درخواست‌های بدون session

- [x] **بازنگری سیاست‌های دسترسی**
  - پیاده‌سازی: AccessLevel model با permissions array
  - Middleware: `checkPermission(resource, action)` در `accessCheck.auth.ts`
  - بازخوانی permissions در هر درخواست (بدون cache)
- [x] **جلوگیری از دسترسی موجودیت فعال به موجودیت غیرفعال بر اساس قوانین سند ST**
  - گارد `rejectInactiveEntity` در `inactive-entity.guard.ts` و اعمال روی مسیرهای کاربر
  - در صورت هدف غیرفعال، پاسخ 403 + ثبت `inactive_entity_access` در لاگ امنیتی
  - مسیرهای مجاز (مثل فعال‌سازی) از گارد مستثنی می‌شوند

---

## 🔴 اولویت بالا - امنیت نشست و کوکی

- [x] **تنظیم Secure Flag کوکی**
  - پیاده‌سازی: `security.config.ts` - `SESSION_COOKIE_SECURE: true`
  - فقط در HTTPS کوکی ارسال می‌شود
  - `sameSite: 'strict'` برای جلوگیری از CSRF

- [x] **تنظیم HttpOnly Flag**
  - پیاده‌سازی: `security.config.ts` - `SESSION_COOKIE_HTTP_ONLY: true`
  - کوکی از JavaScript قابل دسترسی نیست
  - جلوگیری از حملات XSS

- [x] **انقضای نشست**
  - پیاده‌سازی: `SESSION_TIMEOUT_MINUTES` در SecurityConfig
  - Redis: `TTL` بر اساس تنظیمات
  - `maxAge` در cookie options
  - بررسی idle timeout در هر درخواست
- [x] **محدودیت نشست همزمان per-user مطابق آستانه تعریف‌شده (مثلاً ۱)**
  - Middleware: `preventConcurrentSessions` در `concurrent-sessions.middleware.ts`
  - اعمال در `login.Routes.ts` قبل از احراز هویت
  - آستانه از SecurityConfig (`MAX_CONCURRENT_SESSIONS`) خوانده می‌شود
  - ثبت تلاش مسدود‌شده در `AuthLogger.loginFailed`

- [x] **عدم ذخیره اطلاعات حساس در localStorage**
  - سطح دسترسی و مقادیر حساس در localStorage ذخیره شده
  - دسترسی آسان از طریق اسکریپت‌های سمت کلاینت
  - توصیه: استفاده از session یا توکن‌های رمزنگاری‌شده

---

## 🟠 اولویت متوسط - HTTP Methods و Headers

- [x] **اصلاح متدهای PUT و POST**
  - پیاده‌سازی: مدیریت متد در Routerها
  - پاسخ 405 Method Not Allowed برای متدهای نامعتبر

- [x] **بستن متد OPTIONS**
  - پیاده‌سازی: CORS middleware در `app.Application.ts`
  - فقط originهای مجاز پاسخ دریافت می‌کنند

- [x] **پنهان‌سازی Headers**
  - پیاده‌سازی: Helmet و `security.middleware.ts`
  - حذف: `X-Powered-By`, `Server`
  - اضافه: `X-Content-Type-Options`, `X-Frame-Options`

---

## 🟠 اولویت متوسط - مدیریت خطا

- [x] **اصلاح Stack Trace**
  - پیاده‌سازی: `errorHandler.middleware.ts`
  - Stack Trace فقط در حالت development نمایش داده می‌شود
  - در production فقط پیام خطای کلی برمی‌گردد

- [x] **مدیریت آسیب‌پذیری CRLF**
  - پیاده‌سازی: `express-validator` + DTO validation
  - Sanitize کردن ورودی‌ها از کاراکترهای خطرناک
  - پاسخ 400 Bad Request برای ورودی نامعتبر

- [x] **محدودیت طول ورودی**
  - پیاده‌سازی: `@MaxLength` در DTOها
  - Username: حداکثر 100 کاراکتر
  - Password: حداکثر 128 کاراکتر
  - پاسخ 400 برای ورودی بیش از حد

- [x] fix ip and in user createation and let loggin
  - پیاده‌سازی: تابع `getClientIP` در `util.tools.ts` برای استخراج یکنواخت IP
  - اولویت: `x-real-ip` > `x-forwarded-for` (اولین IP) > `req.ip` > `socket.remoteAddress`
  - پشتیبانی از IPv6 mapped format و تبدیل به IPv4
  - به‌روزرسانی: `authorize.auth.ts`, `user_agent.utility.ts`, `ipRestriction.service.ts`, `login-rate-limit.middleware.ts`
  
- [x] **add size limitation in mongodb**
  - پیاده‌سازی: `maxSizeBytes` در تنظیمات `logBackup`
  - پیش‌فرض: 1GB (1024 * 1024 * 1024 bytes)
  - محدوده: 1MB تا 10GB
  - Endpoint: `PUT /api/v1/logs/backup/ttl` با پارامتر `maxSizeBytes`
  - هشدار در صورت رسیدن به آستانه (پیش‌فرض 80%)
  
- [x] **add number of logs for retention**
  - پیاده‌سازی: `maxLogCount` در تنظیمات `logBackup`
  - پیش‌فرض: 1,000,000 لاگ
  - محدوده: 1,000 تا 100,000,000 لاگ
  - Endpoint: `PUT /api/v1/logs/backup/ttl` با پارامتر `maxLogCount`
  - Endpoint: `GET /api/v1/logs/backup/storage-warning` - بررسی وضعیت هشدار
  - هشدار در صورت رسیدن به آستانه تعداد لاگ‌ها
---

## 🟠 اولویت متوسط - آسیب‌پذیری‌ها

- [x] **رفع Clickjacking**
  - پیاده‌سازی: Helmet در `app.Application.ts`
  - هدر: `X-Frame-Options: DENY`
  - CSP: `frame-ancestors 'none'`

- [x] **رفع Race Condition**
  - پیاده‌سازی: `resource-rate-limit.middleware.ts`
  - محدودیت بر اساس userId + endpoint
  - ذخیره‌سازی در Redis با TTL
  - پاسخ 429 Too Many Requests

---

## 🟠 اولویت متوسط - سیستم لاگ

### وضعیت پوشش رویدادهای لاگ طبق فهرست ST
- ✅ ورود/خروج و نشست: ورود موفق/ناموفق، خروج، انقضای نشست و خاتمه دستی (AuthLogger).
- ✅ سازوکار احراز هویت/OTP: فعال/غیرفعال/اعتبارسنجی OTP و دسترسی غیرمجاز/محدودیت IP (AuthLogger).
- ✅ تلاش‌های رمز عبور: لاگ موفق/ناموفق با جزییات تلاش (AuthLogger.loginFailed).
- ✅ تغییر پیکربندی امنیت/لاگ: تغییر TTL/حجم/تعداد لاگ‌ها و تنظیمات امنیتی (SecurityLogger.logBackupConfigUpdated و سایر رویدادها).
- ✅ سرریز آستانه حافظه/تعداد لاگ: هشدار و بحرانی ثبت می‌شود (BackupLogger.storageWarningThresholdExceeded/Critical).
- ✅ ورود/خروج داده‌ها: دانلود ویدیو/گزارش، خروجی پشتیبان و ورودی‌های انبوه/فایل (DataImportExportLogger در routes گزارش/فایل/اسنپ‌شات).
- ✅ تغییرات نقش/سطح دسترسی/پسورد و چک مجوز: ثبت می‌شود (UserLogger + accessCheck.auth.ts).
- ✅ شکست‌های امنیتی ورودی و rate-limit: ثبت می‌شود (SecurityLogger).
- ✅ عملیات پشتیبان‌گیری/پاکسازی/زمان‌بندی: ثبت می‌شود (BackupLogger، BackupSchedulerLogger).

#### شکاف‌ها / نیاز به اقدام
- ✅ ثبت «خواندن رکوردهای لاگ»: در `log.controller.ts` برای getLogs/getLogById رویداد `log_access` ثبت می‌شود (موفق/ناموفق).
- ✅ جلوگیری و لاگ‌کردن دسترسی به موجودیت غیرفعال: گارد `rejectInactiveEntity` اضافه و روی مسیرهای کاربر اعمال شد (لاگ `inactive_entity_access`).
- ✅ محدودیت نشست هم‌زمان و لاگ «عدم ایجاد نشست به دلیل سقف»: با middleware `preventConcurrentSessions` در `login.Routes.ts` اعمال و در صورت تجاوز، AuthLogger.loginFailed ثبت می‌شود.
- ✅ تغییر رفتار توابع کارکردی/گروه‌های کاربری: برای تغییر role/access-level رویداد `functional_behavior_changed` در SecurityLogger ثبت می‌شود.

- [x] **حذف/بایگانی لاگ‌های قدیمی بر اساس سیاست TTL/حجم**
  - پیاده‌سازی: `logConfig.controller.ts` + `logConfig.routes.ts`
  - Endpointها: `/logs/backup/trigger-cleanup`, `/storage-stats`, `/storage-warning`, `/retention-preview`
  - پاکسازی TTL با امکان backup خودکار، محدودیت حجم (`maxSizeBytes`) و تعداد (`maxLogCount`)

- [x] **اقدام به تغییر لاگ از طریق پایگاه داده**
  - پیاده‌سازی: `simulateLogTampering()` در `logIntegrity.controller.ts`
  - Endpoint: `POST /api/v1/logs/integrity/simulate/:logId`
  - Body: `{ field: "message"|"level"|"action", newValue: "..." }`
  - تغییر مستقیم در MongoDB بدون عبور از Mongoose hooks
  - مقایسه hash قبل و بعد از تغییر

- [x] **نمایش واکنش سیستم به تغییر لاگ از طریق پایگاه داده**
  - پیاده‌سازی: `getTamperingReport()` در `logIntegrity.controller.ts`
  - Endpoint: `GET /api/v1/logs/integrity/report/:logId`
  - نمایش وضعیت integrity (INTACT/TAMPERED)
  - نمایش severity (INFO/CRITICAL)
  - نمایش recommended actions
  - ارسال alert به Kafka در صورت تشخیص tampering
  - Endpoint بازیابی: `POST /api/v1/logs/integrity/restore/:logId`

- [x] **ثبت مقدار قبلی در لاگ**
  - پیاده‌سازی: `UserLogger.userUpdated()` در `user.logger.ts`
  - پارامتر `changes`: `{ field: { old, new } }`
  - ذخیره در MongoDB با تاریخ‌تمبر


- [x] **ثبت کامل جزئیات تغییرات**
  - `UserLogger.roleAssigned()` - تغییر نقش با مقدار قبلی/جدید
  - `UserLogger.accessLevelAssigned()` - تغییر سطح دسترسی
  - `UserLogger.userUpdated()` - تغییرات با diff کامل
  - event types: `role_assigned`, `access_level_assigned`, `user_updated`

- [x] **رفع undefined در کاربر**
  - پیاده‌سازی: بررسی null/undefined در loggerها
  - مقدار پیش‌فرض "unknown" برای فیلدهای خالی
  - populate کامل کاربر در کوئری‌ها

- [x] **اصلاح جستجوی لاگ**
  - Endpoint یکپارچه: `GET /api/v1/logs`
  - جستجو با پارامتر `search` در فیلدهای متعدد
  - فیلدهای جستجو: message, action, level, username, ip, userAgent, url, method, details
  - پشتیبانی از فرمت خروجی: `format=readable` (پیش‌فرض) یا `format=raw`
  - فیلترها: action, category, level, username, ip, success, startDate, endDate
  - فیلتر HTTP: showHttpLogs, httpMethod, onlyHttpLogs
  - مرتب‌سازی: sortBy, sortOrder
  - صفحه‌بندی: page, limit

- [x] **مرتب‌سازی بر اساس مکان رویداد**
  - پیاده‌سازی: پشتیبانی از `sortBy=metadata.ip` و `sortOrder=asc|desc`
  - Endpoint: `GET /api/v1/logs?sortBy=metadata.ip&sortOrder=asc`
  - ایندکس MongoDB: `{ 'metadata.ip': 1, timestamp: -1 }`
  - IP در فیلد `metadata.ip` ذخیره می‌شود

- [x] **مرتب‌سازی نوع حساب کاربران**
  - پیاده‌سازی: پشتیبانی از `sortBy=metadata.type` و `sortOrder=asc|desc`
  - Endpoint: `GET /api/v1/logs?sortBy=metadata.type&sortOrder=asc`
  - نوع حساب در فیلد `metadata.type` ذخیره می‌شود
  - Endpoint برای گرفتن فیلدهای قابل مرتب‌سازی: `GET /api/v1/logs/sort-options`


- [x] **خوانایی لاگ‌ها**
  - پیاده‌سازی: `logFormatter.ts` برای تبدیل لاگ‌های خام به فرمت خوانا
  - Endpoint: `GET /api/v1/logs/formatted` - دریافت لاگ‌های فرمت‌شده
  - فیلدهای خوانا: `summary` (خلاصه فارسی)، `action.label` (برچسب رویداد)
  - پشتیبانی از فیلتر بر اساس: `category`, `action`, `level`, `username`, `ip`, `success`
  - زمان نسبی: "2 ساعت پیش"، "دیروز" و غیره
  
- [x] **نمایش نتیجه رویداد**
  - پیاده‌سازی: فیلد `success` در پاسخ فرمت‌شده
  - خلاصه فارسی شامل نتیجه: "(موفق)" یا "(ناموفق)"
  - فیلتر بر اساس موفقیت: `?success=true` یا `?success=false`
  - Endpoint: `GET /api/v1/logs/stats` - آمار موفقیت/شکست


- [x] **بهبود نمایش نوع رخداد**
  - پیاده‌سازی: دسته‌بندی رویدادها در `ACTION_CATEGORIES`
  - برچسب فارسی: `ACTION_LABELS` برای هر نوع رویداد
  - Endpoint: `GET /api/v1/logs/filter-options` - لیست رویدادها با برچسب
  - دسته‌ها: احراز هویت، مدیریت کاربران، سیستم، IP و غیره

- [x] **رفع داده‌های نامفهوم**
  - پیاده‌سازی: `generateSummary()` برای تولید خلاصه فارسی
  - نمونه: "admin با موفقیت وارد شد از 192.168.1.1"
  - حذف داده‌های داخلی و اضافی از `details`
  - ساده‌سازی User Agent: "Chrome on Windows"

- [ ] **اسکرول در صفحه لاگ**
  - امکان اسکرول کردن صفحه وجود ندارد
  - فقط با Zoom Out می‌توان اطلاعات پایین صفحه را دید
  - اطلاعات به صورت ناقص ثبت شده
  - نیاز به بهبود در فرانت‌اند

- [x] **بخش لاگ مجزا برای کاربران** 
    - Endpoints:
      - `GET /api/v1/config/user/auth-history` - تاریخچه کامل احراز هویت
      - `GET /api/v1/config/user/auth-summary` - خلاصه ۳۰ روز اخیر
    - شامل: جزئیات واسط کلاینت و پیشینه احراز هویت (تلاش موفق/ناموفق)
    - اطلاعات کلاینت: نام مرورگر، نسخه، سیستم عامل، نوع دستگاه (موبایل/دسکتاپ/تبلت)
    - برچسب‌های فارسی برای مرورگرها و سیستم عامل‌ها

---

## 🟡 اولویت پایین - رابط کاربری

- [x] **نمایش دکمه Logout**
  - Backend: `POST /api/v1/auth/logout`
  - حذف session از Redis
  - پاسخ 200 با پیام موفقیت

---

## 🟡 اولویت پایین - ویژگی‌های جدید

- [x] **ثبت User Agent**
  - پیاده‌سازی: `req.headers['user-agent']` در `AuthLogger`
  - ذخیره در فیلد `userAgent` در Log model
  - قابل مشاهده در `GET /api/v1/config/user/auth-history`

- [x] **بخش لاگ مجزا برای کاربران**
  - Endpoints:
    - `GET /api/v1/config/user/auth-history` - تاریخچه ورود
    - `GET /api/v1/config/user/auth-summary` - خلاصه 30 روز اخیر
  - Controller: `userAuthHistory.controller.ts`
  - پارامترها: `page`, `limit`, `sortBy`, `sortOrder`, `startDate`, `endDate`
  - شامل: IP، User Agent، تلاش‌های موفق/ناموفق، زمان

- [x] **تعیین حد آستانه در تنظیمات امنیتی**
  - قابلیت تنظیم مدت زمان نگهداری لاگ‌ها توسط کاربر
  - Endpoint: `PUT /api/v1/logs/backup/ttl` - تنظیم TTL لاگ‌ها (روز)
  - Endpoint: `GET /api/v1/logs/backup/ttl` - دریافت تنظیمات TTL
  - Endpoint: `GET /api/v1/logs/backup/storage-stats` - آمار ذخیره‌سازی لاگ‌ها
  - Endpoint: `POST /api/v1/logs/backup/trigger-cleanup` - پاکسازی دستی لاگ‌ها
  - Endpoint: `GET /api/v1/logs/backup/retention-preview` - پیش‌نمایش تأثیر تغییرات TTL
  - Config: `LOG_TTL_DAYS` (پیش‌فرض 60 روز)
  - پشتیبان‌گیری خودکار قبل از حذف لاگ‌های منقضی
  - تنظیمات قابل پیکربندی: `maxSizeBytes`, `warningThreshold`, `autoBackup`, `autoCleanup`

- [x] **فعال/غیرفعال‌سازی کاربر**
  - Endpoints:
    - `PATCH /api/v1/config/users/:id/activate`
    - `PATCH /api/v1/config/users/:id/deactivate`
  - پیاده‌سازی: `user.controller.ts` - `activateUser/deactivateUser`
  - فیلد: `is_active: Boolean` در User model
  - خاتمه نشست‌ها پس از غیرفعال‌سازی

- [ ] **محدودیت بر اساس روز، زمان و پورت**
  - فقط محدودیت بر اساس IP وجود دارد
  - بخشی برای محدودیت بر اساس روز، زمان و شماره پورت مشخص نشده
  - طبق سند ST توضیحاتی داده نشده

- [x] **نمایش آخرین ورود موفق**
  - پیاده‌سازی: `passport.setup.ts` + `authorize.auth.ts`
  - فیلد `last_successful_login` در پاسخ لاگین
  - ذخیره `previous_last_login` قبل از به‌روزرسانی
  - شامل تاریخ و زمان آخرین ورود موفق قبلی
  

- [x] **دریافت زمان از سرور**
  - Endpoint: `GET /api/v1/system/time`
  - Controller: `serverTime.controller.ts`
  - پاسخ: `{ timestamp, iso, utc, timezone, offset }`
  - بدون نیاز به احراز هویت

- [x] **نمایش الگوریتم هش**
  - طبق سند ST سامانه از SHA-256 استفاده می‌کند
  - اما الگوریتم هش در سامانه نامعلوم است
  - باید با اندازه خلاصه پیام 160/256/384/512 بیتی باشد

---

## ✅ موارد تکمیل شده

- [x] کوکی‌ها غیرقابل حدس هستند
  - پیاده‌سازی: `express-session` + `crypto.randomBytes`
  - Session ID: 32 بایت تصادفی
- [x] کوکی جدید در هر ورود تولید می‌شود
  - `req.session.regenerate()` پس از لاگین موفق
- [x] ارتباطات از طریق TLS امن‌سازی شده
  - پیاده‌سازی: `https.createServer()` + SSL certificates
  - فایل‌ها: `security/sslconfig/`
- [x] پشتیبانی از HTTPS و TLS 1.2
  - Config: `secureOptions: SSL_OP_NO_TLSv1 | SSL_OP_NO_TLSv1_1`
  - حداقل TLS 1.2 الزامی
- [x] محدودیت بر اساس IP پیاده‌سازی شده
  - پیاده‌سازی: `ip-restriction.middleware.ts`
  - لیست سفید/سیاه IP در SecurityConfig
  - Endpoint: `PUT /api/v1/config/security/ip-restriction`


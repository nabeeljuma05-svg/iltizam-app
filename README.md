# التزام — تطبيق تتبع الأهداف والعادات

تطبيق ويب لتتبع الأهداف والعادات اليومية، مع تقييم يومي بالذكاء الاصطناعي (Claude) من 10.

## البنية

- `src/` — واجهة React (Vite)، فيها شاشة تسجيل دخول/إنشاء حساب (`src/Auth.jsx`)
- `server/` — سيرفر Express صغير يحمي مفتاح API ويتواصل مع Anthropic بالنيابة عن المتصفح
- **Supabase** — قاعدة بيانات + نظام مستخدمين (تسجيل دخول بإيميل وكلمة مرور)، كل مستخدم يشوف بياناته فقط بفضل Row Level Security

## إعداد Supabase (مرة وحدة)

1. أنشئ حساب ومشروع جديد مجاني على https://supabase.com
2. من **Project Settings -> API** خذ نسختين: `Project URL` و `anon public key`
3. من **SQL Editor** بلوحة Supabase، افتح استعلام جديد، انسخ محتوى ملف `supabase-schema.sql` من هالمشروع، وشغّله. هاد بينشئ جدولين (`habits` و `entries`) مع صلاحيات أمان تضمن إنو كل مستخدم يشوف بياناته فقط.
4. (اختياري) من **Authentication -> Providers**، تأكد إنو Email مفعّل. تقدر كمان توقف تأكيد الإيميل الإلزامي من **Authentication -> Settings** إذا بدك تجربة أسرع بدون تفعيل بريد.

## التشغيل محلياً

1. ثبّت الحزم:
   ```bash
   npm install
   ```

2. انسخ ملف البيئة وعبّي القيم:
   ```bash
   cp .env.example .env
   ```
   - `ANTHROPIC_API_KEY` من https://console.anthropic.com/
   - `VITE_SUPABASE_URL` و `VITE_SUPABASE_ANON_KEY` من مشروع Supabase تبعك (خطوة 2 فوق)

3. شغّل السيرفر والواجهة معاً:
   ```bash
   npm run dev
   ```
   الواجهة بتفتح على `http://localhost:5173` والسيرفر على `http://localhost:8787`.

## البناء للنشر (Production)

```bash
npm run build
npm start
```

هيك بيبني الواجهة إلى `dist/` والسيرفر (`server/index.js`) بيقدّمها مباشرة على نفس الـ PORT (افتراضياً 8787).

## خيارات النشر (Hosting)

أبسط طريقة: أي منصة بتدعم Node.js server (وليس Static hosting فقط)، لأن التطبيق محتاج السيرفر الخلفي لحماية مفتاح الـ API:

- **Render** أو **Railway**: اربط المستودع، حدد `npm run build && npm start`، وضيف متغير البيئة `ANTHROPIC_API_KEY` من لوحة التحكم.
- **Fly.io**: نفس الفكرة عبر `fly launch` مع تحديد start command.
- **VPS عادي** (DigitalOcean، Hetzner...): استنسخ المشروع، شغّل `npm install && npm run build`، وشغّل `npm start` خلف PM2 أو systemd، مع reverse proxy عبر Nginx.

⚠️ **لا تنشر مفتاح API بالكود أو بمتغير بيئة VITE_ (يبدأ بـ `VITE_`)** لأنه بينكشف بالمتصفح — لازم يبقى فقط على السيرفر (`server/index.js`) كما هو معدّ حالياً.

## ملاحظات

- كل مستخدم عنده حساب فعلي (إيميل + كلمة مرور عبر Supabase Auth)، وبياناته محفوظة بقاعدة بيانات مركزية — يقدر يدخل من أي جهاز ويشوف نفس أهدافه وسجله.
- الأمان مضبوط عبر Row Level Security بقاعدة البيانات: ما في طريقة يشوف مستخدم بيانات مستخدم ثاني حتى لو حاول يتلاعب بالطلبات.
- النموذج المستخدم للتقييم: `claude-sonnet-4-6`. تقدر تبدله بموديل ثاني من داخل `server/index.js`.
- لإضافة تسجيل دخول بجوجل أو أبل بدل الإيميل وكلمة المرور، فعّلها من Supabase **Authentication -> Providers** وعدّل `src/Auth.jsx` باستدعاء `supabase.auth.signInWithOAuth(...)`.

# My Private AI Chat v2

واجهة دردشة شخصية على Vercel تدعم تحليل الملفات، مع إبقاء مفتاح OpenAI في الخادم.

## متغيرات البيئة في Vercel

- `OPENAI_API_KEY`
- `SITE_PASSWORD`
- `OPENAI_MODEL` — مثال: `gpt-5-mini`
- `SITE_NAME` — الاسم الذي يظهر أعلى الموقع وفي عنوان المتصفح

## الملفات المدعومة

PDF، Word، PowerPoint، Excel، CSV، TXT، Markdown، JSON، HTML، XML.

## حد الرفع في هذه النسخة

حتى 3 ملفات وبحجم إجمالي أقصى 2.5 ميجابايت، لأن الملفات تمر عبر Vercel Function.

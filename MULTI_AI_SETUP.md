# دليل إعداد الذكاء الاصطناعي المتعدد - Multi AI Setup Guide

## 🎯 نظرة عامة

يدعم التطبيق الآن **عدة مقدمي خدمات للذكاء الاصطناعي** مع التبديل التلقائي للحصول على أفضل موثوقية وأداء.

## 🚀 المقدمون المدعومون

### 1. **DeepSeek** (الأفضل - مجاني)
```bash
DEEPSEEK_API_KEY=sk-your-deepseek-key
```
- ✅ **مجاني** مع حد أدنى من القيود
- 🌍 [احصل على مفتاح](https://platform.deepseek.com)
- 🔥 **مُوصى به بشدة**

### 2. **Google Gemini** (سريع ودقيق)
```bash
GEMINI_API_KEY=AIza-your-gemini-key
```
- ✅ رصيد مجاني جيد
- 🌍 [احصل على مفتاح](https://makersuite.google.com/app/apikey)

### 3. **Groq** (سريع جداً)
```bash
GROQ_API_KEY=gsk_your-groq-key
```
- ✅ مجاني مع حدود يومية
- ⚡ **أسرع استجابة**
- 🌍 [احصل على مفتاح](https://console.groq.com/keys)

### 4. **OpenAI GPT** (موثوق)
```bash
OPENAI_API_KEY=sk-proj-your-openai-key
```
- 💰 مدفوع لكن موثوق
- 🌍 [احصل على مفتاح](https://platform.openai.com/api-keys)

### 5. **Anthropic Claude** (للمهام المعقدة)
```bash
ANTHROPIC_API_KEY=sk-ant-your-claude-key
```
- 💰 مدفوع
- 🧠 **الأذكى للمهام المعقدة**
- 🌍 [احصل على مفتاح](https://console.anthropic.com)

## ⚙️ خطوات الإعداد

### الطريقة 1: استخدام واجهة التطبيق
1. اضغط على "إعدادات الذكاء الاصطناعي"
2. أدخل مفاتيح API في التبويبات المناسبة
3. اختبر كل مفتاح
4. انسخ متغيرات البيئة
5. أضفها لإعدادات الخادم

### الطريقة 2: إعداد مباشر
```bash
# أضف للخادم أو ملف .env
DEEPSEEK_API_KEY=your_deepseek_key
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_claude_key
```

## 🔄 آلية العمل

### ترتيب الأولوية:
1. **DeepSeek** - يُجرب أولاً (مجاني)
2. **Gemini** - إذا فشل الأول
3. **OpenAI** - إذا فشل الثاني
4. **Groq** - للسرعة العالية
5. **Claude** - للمهام المعقدة
6. **التحليل الأساسي** - إذا فشل الجميع

### المزايا:
- 🛡️ **موثوقية عالية** - لا يتوقف العمل أبداً
- 💰 **توفير تكلفة** - يستخدم الخدمات المجانية أولاً
- ⚡ **أداء محسن** - اختيار أسرع خدمة متاحة
- 🔄 **تبديل تلقائي** - عند فشل أي خدمة

## 🎯 التوصيات

### للاستخدام الشخصي:
```bash
# كافي جداً
DEEPSEEK_API_KEY=your_key
GEMINI_API_KEY=your_key
```

### للاستخدام المكثف:
```bash
# إعداد كامل مع احتياطيات
DEEPSEEK_API_KEY=your_key
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
OPENAI_API_KEY=your_key
```

### للشركات:
```bash
# جميع الخدمات للموثوقية القصوى
DEEPSEEK_API_KEY=your_key
GEMINI_API_KEY=your_key
GROQ_API_KEY=your_key
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
```

## 🔍 مراقبة الحالة

يمكنك مراقبة حالة جميع مقدمي الخدمات من خلال:
- 📊 شارة ال��الة في أعلى التطبيق
- 🔧 نافذة إعدادات الذكاء الاصطناعي
- 🌐 استدعاء `/api/ai-status`

## 🚨 استكشاف الأخطاء

### مشكلة: لا يعمل أي مقدم خدمة
```bash
# تحقق من إعدادات البيئة
echo $DEEPSEEK_API_KEY
echo $GEMINI_API_KEY
```

### مشكلة: مفتاح معين لا يعمل
1. تحقق من صحة المفتاح
2. تحقق من الرصيد المتبقي
3. جرب مفتاح آخر

### الحل الطارئ:
```bash
# إلغاء جميع المفاتيح للعودة للتحليل الأساسي
unset DEEPSEEK_API_KEY GEMINI_API_KEY OPENAI_API_KEY GROQ_API_KEY ANTHROPIC_API_KEY
```

## 🎉 الخلاصة

النظام الآن أكثر قوة وموثوقية! يمكنك:
- ✅ استخدام خدمات مجانية متعددة
- ✅ عدم القلق من انقطاع الخدمة
- ✅ توفير المال بالاعتماد على المجاني أولاً
- ✅ الحصول على أفضل أداء ممكن

**🚀 ابدأ بـ DeepSeek و Gemini - هما كافيان لمعظم الاستخدامات!**

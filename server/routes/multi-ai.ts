import { RequestHandler } from "express";
import OpenAI from "openai";

export interface AIProvider {
  name: string;
  displayName: string;
  apiKey?: string;
  baseURL?: string;
  model: string;
  available: boolean;
  priority: number;
}

interface CommandAnalysisRequest {
  text: string;
  context?: string;
}

interface CommandAnalysisResponse {
  isCommand: boolean;
  commandType: 'insert' | 'delete' | 'replace' | 'format' | 'control' | null;
  action: string;
  target?: string;
  content?: string;
  replacement?: string;
  confidence: number;
  explanation: string;
  provider?: string;
}

// Runtime API keys storage (in memory)
const runtimeAPIKeys: { [providerName: string]: string } = {};

// Function to get API key (runtime or environment)
const getAPIKey = (providerName: string): string | undefined => {
  return runtimeAPIKeys[providerName] || process.env[`${providerName.toUpperCase()}_API_KEY`] ||
         (providerName === 'claude' ? process.env.ANTHROPIC_API_KEY : undefined);
};

// Function to check if provider is available
const isProviderAvailable = (providerName: string): boolean => {
  return !!getAPIKey(providerName);
};

// AI Providers Configuration (dynamic based on runtime + env)
const getAIProviders = (): AIProvider[] => [
  {
    name: 'deepseek',
    displayName: 'DeepSeek (مجاني)',
    baseURL: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKey: getAPIKey('deepseek'),
    available: isProviderAvailable('deepseek'),
    priority: 1
  },
  {
    name: 'gemini',
    displayName: 'Google Gemini',
    baseURL: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-1.5-flash',
    apiKey: getAPIKey('gemini'),
    available: isProviderAvailable('gemini'),
    priority: 2
  },
  {
    name: 'openai',
    displayName: 'OpenAI GPT',
    model: 'gpt-3.5-turbo',
    apiKey: getAPIKey('openai'),
    available: isProviderAvailable('openai'),
    priority: 3
  },
  {
    name: 'claude',
    displayName: 'Anthropic Claude',
    baseURL: 'https://api.anthropic.com/v1',
    model: 'claude-3-haiku-20240307',
    apiKey: getAPIKey('claude'),
    available: isProviderAvailable('claude'),
    priority: 4
  },
  {
    name: 'groq',
    displayName: 'Groq (سريع)',
    baseURL: 'https://api.groq.com/openai/v1',
    model: 'llama-3.1-8b-instant',
    apiKey: getAPIKey('groq'),
    available: isProviderAvailable('groq'),
    priority: 5
  }
];

// Get current AI providers
const AI_PROVIDERS = getAIProviders();

// Initialize clients for available providers
const aiClients: { [key: string]: any } = {};

const initializeAIClients = () => {
  // Clear existing clients
  Object.keys(aiClients).forEach(key => delete aiClients[key]);

  const currentProviders = getAIProviders();

  currentProviders.forEach(provider => {
    if (provider.available) {
      try {
        if (provider.name === 'openai' || provider.name === 'deepseek' || provider.name === 'groq') {
          aiClients[provider.name] = new OpenAI({
            apiKey: provider.apiKey,
            baseURL: provider.baseURL,
          });
        } else if (provider.name === 'gemini') {
          // Gemini uses different API structure
          aiClients[provider.name] = {
            apiKey: provider.apiKey,
            baseURL: provider.baseURL
          };
        } else if (provider.name === 'claude') {
          // Claude uses different API structure
          aiClients[provider.name] = {
            apiKey: provider.apiKey,
            baseURL: provider.baseURL
          };
        }
        console.log(`✅ ${provider.displayName} initialized successfully`);
      } catch (error) {
        console.warn(`❌ Failed to initialize ${provider.displayName}:`, error);
      }
    }
  });
};

// Advanced AI system prompt for deep analysis and enhanced understanding
function getEnhancedSystemPrompt(): string {
  return `🧠 أنت ذكاء اصطناعي متطور ومتخصص في التحليل العميق للكلام الطبيعي العربي للتحكم في الوثائق.

## 🎯 مهمتك الأساسية:
تحليل النصوص العربية بعمق وذكاء لفهم المقصود الحقيقي، وتمييز الأوامر من النصوص العادية بدقة عالية.

## 💡 منهجية التفكير المتقدمة (يجب اتباعها دائماً):

### 🔍 المرحلة 1: التحليل الأولي العميق
1. **قراءة شاملة**: اقرأ النص كاملاً عدة مرات لفهم السياق العام
2. **تحليل اللغة**: حدد الأفعال، الأسماء، المفاعيل، وأدوات الربط
3. **فهم النية**: ما الهدف الحقيقي من هذا النص؟
4. **كشف الأوامر المخفية**: هل يو��د أوامر ضمنية غير مباشرة؟

### 🔬 المرحلة 2: التحليل السياقي المتقدم
1. **تحليل الضمائر**: من أو ما تشير إليه الضمائر؟
2. **فهم الإشارات**: تحليل كلمات مثل "هذا"، "ذلك"، "هنا"، "هناك"
3. **تتبع الموضوع**: ما الموضوع الرئيسي الذي يتحدث عنه النص؟
4. **فهم التسلسل**: هل الأوامر مترابطة أم منفصلة؟

### 🎭 المرحلة 3: تحليل النوايا المتعددة
1. **أمر مباشر**: مثل "احذف هذا" أو "أضف كلمة"
2. **أمر غير مباشر**: مثل "أريد أن أرى كلمة هنا" (= أضف كلمة)
3. **نص عادي**: محتوى يجب إدراجه كما هو
4. **استفهام إرشادي**: أسئلة تحتاج إجابات وليس تعديل

### 🧩 المرحلة 4: حل التعقيدات
1. **النصوص الطويلة**: قسم النص لوحدات منطقية صغيرة
2. **الأوامر المتعددة**: حدد كل أمر منفصل
3. **التناقضات**: حل التناقضات باختيار الأمر الأوضح
4. **الغموض**: اطلب توضيح إذا كان الأمر غامضاً جداً

## 🔍 ت��ليل أنواع النصوص:

### 📝 النصوص العادية (ليست أوامر):
- تحتوي على معلومات أو محتوى
- تبدأ بكلمات مثل: "إن"، "كان"، "يذكر"، "نعلم أن"
- لا تحتوي على أفعال الأمر أو طلبات مباشرة
- **مثال**: "الحمد لله رب ا��عالمين" = محتوى ليس أمر

### ⚡ الأوامر المباشرة:
- تحتوي على أفعال أمر واضحة: "احذف"، "أضف"، "غير"، "استبدل"
- تحدد موضع أو هدف واضح
- **مثال**: "احذف كلمة الأول" = أمر حذف مباشر

### 🔄 الأوامر غير المباشرة:
- تعبر عن رغبة أو حاجة: "أريد"، "أحتاج"، "يجب"، "لازم"
- تحتوي على إشارات ضمنية للتعديل
- **مثال**: "أريد كلمة جديدة هنا" = أمر إضافة غير مباشر

## 📏 قوانين دقة البحث والاستهداف:
- **البحث الدقيق**: ابحث عن النص المطلوب بدقة تامة (حروف ومسافات)
- **فهم السياق**: اعتبر السياق المحيط بالنص المستهدف
- **التمييز الدقيق**: ميز بين "الحمد" و "الحمد لله" - هما مختلفان
- **مراعاة الحالة**: احترم الأحرف الكبيرة والصغيرة إذا كانت مهمة

## 🚫 قانون مقدس - احترمه دائماً:
**ممنوع منعاً باتاً إضافة أي محتوى من عندك!**
- لا تضع توضيحات مثل "ليكتمل النص" أو "لتصبح الجملة"
- لا تصلح أخطاء غير مطلوبة
- فقط نفذ ما يطلبه المستخدم بالضبط
- احترم رغبة المستخدم حتى لو بدت غريبة

## 🎯 ��مثلة للتحليل العميق:

### مثال 1: نص عادي (ليس أمر)
**النص**: "الحمد لله رب العالمين الرحمن الرحيم"
**التحليل العميق**:
1. **قراءة شاملة**: النص يحتوي معلومات دينية
2. **تحليل اللغة**: لا يوجد أفعال أمر أو طلبات
3. **فهم النية**: مشاركة محتوى ديني
4. **كشف الأوامر**: لا يوجد أوامر ضمنية
**النتيجة**: isCommand: false - هذا محتوى للإدراج

### مثال 2: أمر مباشر بسيط
**النص**: "أضف بعد كلمة الحمد لله كلمة تعالى"
**التحليل العميق**:
1. **قراءة شاملة**: طلب واضح لإضافة كلمة
2. **تحليل اللغة**: فعل أمر "أضف" + موضع "بعد" + هدف "الحمد لله" + محتوى "تعالى"
3. **فهم النية**: تعديل النص الموجود
4. **كشف الأوامر**: أمر مباشر واضح
**النتيجة**:
- isCommand: true
- commandType: "insert"
- target: "الحمد لله"
- content: "تعالى"
- position: "after"

### مثال 3: أمر غير مباشر معقد
**النص**: "أريد أن أرى كلمة البركة في بداية النص و��يضاً ��لمة الخير في نه��يته"
**التحليل العميق**:
1. **قراءة شاملة**: طلب معقد بأمرين منفصلين
2. **تحليل اللغة**: "أريد أن أرى" = طلب غير مباشر للإضافة
3. **فهم النية**: إضافة كلمتين في موضعين مختلفين
4. **تحليل متعدد**: أمران منفصلان يحتاجان معالجة منفردة
**النتيجة**: اختر الأمر الأول (البركة في البداية) وقل confidence أقل للتعقيد

### مثال 4: نص طويل معقد
**النص**: "هذا موضوع مهم جداً عن الإسلام وأحكامه وأود أن أضيف في بداية هذا النص بسم الله الرحمن الرحيم لأنه مناسب للموضوع"
**التحليل العميق**:
1. **قراءة شاملة**: نص طويل يحتوي معلومات + أمر مدفون
2. **تقسيم منطقي**:
   - الجزء ا��أول: معلومات ("هذا موضوع مهم...")
   - الجزء الثاني: أمر ("أود أن أضيف في بداية...")
3. **استخراج الأمر**: "أضيف في بداية" + محتوى "بسم الله الرحمن الرحيم"
**النتيجة**:
- isCommand: true
- commandType: "insert"
- target: "start"
- content: "بس�� الله الرحمن الرحيم"
- position: "start"

### مثال 5: أوامر متعددة في نص واحد
**النص**: "احذف كلمة الأولى واستبدل كلمة النهاية بكلمة الختام وأضف في المنتصف كلمة الوسط"
**التحليل العميق**:
1. **تحديد الأوامر المتعددة**:
   - أمر 1: "احذف كلمة الأولى"
   - أمر 2: "استبدل كلمة النهاية بكلمة الختام"
   - أمر 3: "أضف في المنتصف كلمة الوسط"
2. **اختيار الأولوية**: اختر الأمر الأول والأوضح
**النتيجة**: نفذ الأمر الأول (حذف) مع confidence معتدل

### مثال 6: غموض يحتاج توضيح
**النص**: "غير هذا الشيء إلى شيء آخر"
**التحليل العميق**:
1. **تحديد الغموض**: "هذا الشيء" و "شيء آخر" ��ير محددين
2. **فهم النية**: طلب استبدال لكن غير واضح
**النتيجة**: confidence منخفض جداً (0.2) مع explanation يطلب توضيح

## 🧠 قواعد الذكاء المتقدم:
1. **اقرأ النص 3 مرات** قبل اتخاذ القرار
2. **فكر بصوت ��الٍ** في الـ thinking field
3. **ش��ّك في فهمك الأول** وأعد التحليل
4. **ابحث عن الأوامر المخفية** في النصوص الطويلة
5. **لا تتسرع** - الدقة أهم من السرعة
6. **استخدم السياق** لفهم الضمائر والإشارات
7. **قسّم النصوص الطويلة** لوحدات منطقية صغيرة

### مثال 2: "ضع في البداية بسم الله"
التفكير:
1. ا��نية: إضافة في المقدمة
2. الفعل: insert
3. الموضع: بداية الوثيقة
4. المحتوى: "بسم الله"
5. ��لمنطق: يصبح أول نص في الوثيقة

الرد: target: "start", content: "بسم الله", position: "start"
**مهم: content يحتوي فقط على "بسم الله" - لا إضافات**

## قوانين دقة البحث:
- عند البحث عن "الحمد لله" ابحث عن هذا النص بالضبط
- لا تخلط بين "الحمد" و "الحمد لله"
- احترم المسافات والحروف بدقة
- إذا لم تجد النص المحدد، اجعل confidence أقل من 0.7

## الرد (JSON فقط):
{
  "thinking": "عملية التفكير و��لتحليل المرحلي",
  "isCommand": boolean,
  "commandType": "insert|delete|replace|format|control|null",
  "action": "وصف دقيق للعمل",
  "target": "النص المحدد للبحث عنه بدقة",
  "content": "المحتوى الذي سيتم إضافته",
  "position": "before|after|start|end|replace",
  "confidence": رقم من 0 إلى 1,
  "explanation": "تفسير مختصر بدون إضافات - فقط وصف العمل"
}

تذكر: فكر أولاً، ثم حلل، ثم قرر. الدقة مطلوبة.
**أهم قاعدة: لا تضيف أي كلمة من عندك - فقط ما يطلبه المستخدم.
ممنوع التفسير أو الإكمال أو إضافة توضيحات.**`;
}

// Helper function to extract JSON from markdown/code blocks
function extractJSONFromResponse(text: string): any {
  try {
    // First try parsing as-is
    return JSON.parse(text);
  } catch {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      let jsonContent = jsonMatch[1];

      try {
        // First try parsing the entire content as one JSON
        return JSON.parse(jsonContent);
      } catch {
        // If that fails, try to handle multiple JSON objects
        // Split by lines and find individual JSON objects
        const lines = jsonContent.split('\n');
        const jsonObjects: any[] = [];
        let currentJson = '';
        let braceCount = 0;

        for (const line of lines) {
          if (line.trim() === '') continue;

          currentJson += line;

          // Count braces to detect complete JSON objects
          for (const char of line) {
            if (char === '{') braceCount++;
            if (char === '}') braceCount--;
          }

          // When braces are balanced, we have a complete JSON object
          if (braceCount === 0 && currentJson.trim()) {
            try {
              const parsed = JSON.parse(currentJson.trim());
              jsonObjects.push(parsed);
              currentJson = '';
            } catch {
              // Continue building the JSON string
              currentJson += '\n';
            }
          } else {
            currentJson += '\n';
          }
        }

        // Return the first valid JSON object if we found any
        if (jsonObjects.length > 0) {
          return jsonObjects[0];
        }

        // If that fails, try to extract any JSON-like content
        const jsonContentMatch = text.match(/\{[\s\S]*?\}/);
        if (jsonContentMatch) {
          return JSON.parse(jsonContentMatch[0]);
        }
      }
    }

    // NEW: Try to find JSON in plain text (for providers that don't use code blocks)
    // Look for pattern like "الرد:" followed by JSON
    const plainJsonMatch = text.match(/(?:الرد:|response:|result:|\{)\s*(\{[\s\S]*?\})/i);
    if (plainJsonMatch) {
      try {
        // Try the captured group first
        let jsonString = plainJsonMatch[1];
        if (!jsonString.startsWith('{')) {
          // If captured group doesn't start with {, use full match
          jsonString = plainJsonMatch[0];
          // Remove any prefix text
          const startBrace = jsonString.indexOf('{');
          if (startBrace !== -1) {
            jsonString = jsonString.substring(startBrace);
          }
        }
        return JSON.parse(jsonString);
      } catch {
        // Continue to next attempt
      }
    }

    // Try to find any valid JSON object in the entire text
    const allJsonMatches = text.matchAll(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/g);
    for (const match of allJsonMatches) {
      try {
        const parsed = JSON.parse(match[0]);
        // Check if it looks like our expected structure
        if (parsed && typeof parsed === 'object' &&
            ('isCommand' in parsed || 'commandType' in parsed || 'action' in parsed)) {
          return parsed;
        }
      } catch {
        continue;
      }
    }

    throw new Error('No valid JSON found in response');
  }
}

// Initial setup
initializeAIClients();

const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في تحل��ل الأوامر الصوتية العربية للتحكم في الوثائق.

مهم��ك: تحليل النص المرسل وتحديد ما إذا كان:
1. أمراً للتحكم في الوثيقة (حذف، إضافة، تعديل، تنسيق)
2. نصاً عادياً يجب إدراجه في الوثيقة

أنواع الأوامر:
- delete: أوامر الحذف (امسح، احذف، إزالة، شيل)
- insert: أوامر الإضافة (أضف، اكتب، ضع)
- replace: أوامر الاستبدال (استبدل، غير، بدّل)
- format: أوامر التنسيق (عنوان، رأس، فقرة، قائمة)
- control: أوامر التحكم (توقف، استمرار، حفظ، خ��اص، كفاية)

الرد يجب أن يكون JSON فقط بدون أي تنسيق markdown أو تعليق��ت:
{
  "isCommand": boolean,
  "commandType": "insert|delete|replace|format|control|null",
  "action": "وصف دقيق للعمل المطلوب",
  "target": "الهدف المح��د (اختياري)",
  "content": "المحتوى المطلوب (اختياري)",
  "confidence": رقم من 0 إلى 1,
  "explanation": "شرح مختصر"
}

مهم: لا تستخدم markdown أو أي ت��سيق. فقط JSON خام.`;

// Try DeepSeek API
async function tryDeepSeek(text: string, context?: string): Promise<CommandAnalysisResponse | null> {
  if (!aiClients.deepseek) return null;

  try {
    const completion = await aiClients.deepseek.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: getEnhancedSystemPrompt() },
        { role: 'user', content: `النص: "${text}"${context ? `\nالسياق: "${context}"` : ''}` }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      console.log('DeepSeek raw response:', response);
      const parsed = extractJSONFromResponse(response);
      return {
        ...parsed,
        provider: 'DeepSeek',
        explanation: parsed.explanation + ' (DeepSeek)'
      };
    }
  } catch (error) {
    console.log('DeepSeek failed:', error);
  }
  return null;
}

// Try Gemini API
async function tryGemini(text: string, context?: string): Promise<CommandAnalysisResponse | null> {
  if (!aiClients.gemini) return null;

  try {
    const response = await fetch(
      `${aiClients.gemini.baseURL}/models/gemini-1.5-flash:generateContent?key=${aiClients.gemini.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${getEnhancedSystemPrompt()}\n\nالنص: "${text}"${context ? `\nالسياق: "${context}"` : ''}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 500,
          }
        }),
      }
    );

    const data = await response.json();
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (responseText) {
      console.log('Gemini raw response:', responseText);
      const parsed = extractJSONFromResponse(responseText);
      return {
        ...parsed,
        provider: 'Gemini',
        explanation: parsed.explanation + ' (Gemini)'
      };
    }
  } catch (error) {
    console.log('Gemini failed:', error);
  }
  return null;
}

// Try OpenAI API
async function tryOpenAI(text: string, context?: string): Promise<CommandAnalysisResponse | null> {
  if (!aiClients.openai) return null;

  try {
    const completion = await aiClients.openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: getEnhancedSystemPrompt() },
        { role: 'user', content: `النص: "${text}"${context ? `\nالسياق: "${context}"` : ''}` }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      console.log('OpenAI raw response:', response);
      const parsed = extractJSONFromResponse(response);
      return {
        ...parsed,
        provider: 'OpenAI',
        explanation: parsed.explanation + ' (OpenAI)'
      };
    }
  } catch (error) {
    console.log('OpenAI failed:', error);
  }
  return null;
}

// Try Groq API
async function tryGroq(text: string, context?: string): Promise<CommandAnalysisResponse | null> {
  if (!aiClients.groq) return null;

  try {
    // Special prompt for Groq to ensure clean JSON output
    const groqSystemPrompt = getEnhancedSystemPrompt() + `

**تعليمات خاصة لـ Groq:**
- يجب أن تكون الاستجابة JSON صحيح فقط
- لا تضع أي نص قبل أو بعد JSON
- لا تستخدم markdown code blocks
- ابدأ الاستجابة مباشرة بـ {
- انته الا��تجابة مباشرة بـ }

مثال للاستجابة المطلوبة:
{
  "thinking": "التفكير هنا",
  "isCommand": true,
  "commandType": "insert",
  "action": "الوصف",
  "target": "",
  "content": "المحتوى",
  "position": "start",
  "confidence": 1,
  "explanation": "التفسير"
}`;

    const completion = await aiClients.groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: groqSystemPrompt },
        { role: 'user', content: `النص: "${text}"${context ? `\nالسياق: "${context}"` : ''}` }
      ],
      temperature: 0.1, // Lower temperature for more consistent output
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content;
    if (response) {
      console.log('Groq raw response:', response);
      const parsed = extractJSONFromResponse(response);
      return {
        ...parsed,
        provider: 'Groq',
        explanation: parsed.explanation + ' (Groq - سريع)'
      };
    }
  } catch (error) {
    console.log('Groq failed:', error);
  }
  return null;
}

// Advanced text preprocessing for complex and long texts
function preprocessComplexText(text: string, context?: string): { processedText: string; analysis: any } {
  const analysis = {
    textLength: text.length,
    isLongText: text.length > 100,
    hasMultipleCommands: false,
    commandIndicators: [],
    contextClues: [],
    complexity: 'simple'
  };

  // Analyze text complexity
  const commandWords = ['أضف', 'احذف', 'استبدل', 'غير', 'ضع', 'اكتب', 'امح', 'بدل', 'حول'];
  const commandIndicatorWords = ['أريد', 'أحتاج', 'يجب', 'لازم', 'ممكن', 'أود', 'أتمنى'];
  const positionWords = ['بعد', 'قبل', 'في البداية', 'في النهاية', 'في الوسط', 'هنا', 'هناك'];

  // Count command indicators
  commandWords.forEach(word => {
    if (text.includes(word)) {
      analysis.commandIndicators.push(word);
    }
  });

  commandIndicatorWords.forEach(word => {
    if (text.includes(word)) {
      analysis.contextClues.push(word);
    }
  });

  // Check for multiple commands
  const commandCount = analysis.commandIndicators.length;
  if (commandCount > 1) {
    analysis.hasMultipleCommands = true;
    analysis.complexity = 'complex';
  } else if (analysis.textLength > 200) {
    analysis.complexity = 'long';
  } else if (analysis.contextClues.length > 0) {
    analysis.complexity = 'moderate';
  }

  // Process text based on complexity
  let processedText = text;

  if (analysis.isLongText) {
    // For long texts, add structure hints
    processedText = `[نص طويل - حلل بعناية]\n${text}\n[انتباه: ابحث ع�� الأوامر المدفونة في النص]`;
  }

  if (analysis.hasMultipleCommands) {
    // For multiple commands, add priority guidance
    processedText = `[أوامر متعددة محتملة - ركز على الأمر الأول والأوضح]\n${processedText}`;
  }

  if (analysis.complexity === 'complex') {
    // For complex texts, add detailed analysis request
    processedText = `[نص معقد - استخدم التحليل العميق المرحلي]\n${processedText}`;
  }

  return { processedText, analysis };
}

// Enhanced context analysis
function analyzeTextContext(text: string, existingContext?: string): string {
  const contextAnalysis = [];

  // Analyze pronouns and references
  const pronouns = ['هذا', 'هذه', 'ذلك', 'تلك', 'هنا', 'هناك'];
  pronouns.forEach(pronoun => {
    if (text.includes(pronoun)) {
      contextAnalysis.push(`الضمير "${pronoun}" يحتاج تحديد المرجع`);
    }
  });

  // Analyze incomplete references
  if (text.includes('الكلمة') || text.includes('النص') || text.includes('الجملة')) {
    contextAnalysis.push('يوجد مراجع غير محددة تحتاج توضيح');
  }

  // Analyze position indicators
  const positions = ['في البداية', 'في النهاية', 'في الوسط', 'بعد', 'قبل'];
  positions.forEach(pos => {
    if (text.includes(pos)) {
      contextAnalysis.push(`مؤشر موضع: ${pos}`);
    }
  });

  let enhancedContext = existingContext || '';
  if (contextAnalysis.length > 0) {
    enhancedContext += `\nتحليل السياق: ${contextAnalysis.join(', ')}`;
  }

  return enhancedContext;
}

// Smart command detection and classification
function detectCommandPatterns(text: string): {
  isLikelyCommand: boolean;
  commandType: string | null;
  confidence: number;
  reasoning: string[]
} {
  const reasoning = [];
  let confidence = 0;
  let commandType = null;

  // Direct command patterns
  const directCommands = {
    'insert': ['أضف', 'ضع', 'اكتب', 'أدرج'],
    'delete': ['احذف', 'امح', 'ازل', 'امسح'],
    'replace': ['استبدل', 'غير', 'بدل', 'حول'],
    'format': ['نسق', 'رتب', 'نظم']
  };

  // Indirect command patterns
  const indirectCommands = ['أريد', 'أحتاج', 'يجب', 'لازم', 'أود', 'أتمنى'];

  // Check for direct commands
  for (const [type, commands] of Object.entries(directCommands)) {
    for (const cmd of commands) {
      if (text.includes(cmd)) {
        commandType = type;
        confidence += 0.8;
        reasoning.push(`وجد أمر مباشر: ${cmd}`);
      }
    }
  }

  // Check for indirect commands
  for (const cmd of indirectCommands) {
    if (text.includes(cmd)) {
      confidence += 0.4;
      reasoning.push(`وجد مؤشر أمر غير مباشر: ${cmd}`);
    }
  }

  // Check for position indicators (enhance command likelihood)
  const positionIndicators = ['بعد', 'قبل', 'في البداية', 'في النهاية'];
  for (const pos of positionIndicators) {
    if (text.includes(pos)) {
      confidence += 0.3;
      reasoning.push(`وجد مؤشر موضع: ${pos}`);
    }
  }

  // Reduce confidence for informational content
  const infoIndicators = ['إن', 'كان', 'يذكر', 'نعلم', 'الحمد', 'بسم'];
  for (const info of infoIndicators) {
    if (text.includes(info)) {
      confidence -= 0.2;
      reasoning.push(`وجد مؤشر محتوى إعلامي: ${info}`);
    }
  }

  confidence = Math.max(0, Math.min(1, confidence));
  const isLikelyCommand = confidence > 0.5;

  return { isLikelyCommand, commandType, confidence, reasoning };
}

// Fallback analysis with enhanced intelligence
function fallbackAnalysis(text: string): CommandAnalysisResponse {
  console.log('🧠 بدء التحليل الذكي البديل للنص:', text);

  // Use smart command detection
  const detection = detectCommandPatterns(text);
  console.log('🔍 نتائج كشف الأوامر:', detection);

  // If likely not a command, treat as content
  if (!detection.isLikelyCommand) {
    return {
      isCommand: false,
      commandType: null,
      action: 'إدراج محتوى',
      content: text.trim(),
      confidence: 1 - detection.confidence,
      explanation: `نص عادي - ${detection.reasoning.join(', ')}`,
      provider: 'التحليل الذكي البديل'
    };
  }

  const cleanText = text.toLowerCase().trim();

  // Enhanced delete commands
  if (cleanText.includes('امس��') || cleanText.includes('احذف') || cleanText.includes('إزالة') || cleanText.includes('شيل')) {
    // Try to find target
    if (cleanText.includes('آخر') || cleanText.includes('أخير')) {
      return {
        isCommand: true,
        commandType: 'delete',
        action: 'حذف آخر عنصر',
        target: 'last',
        confidence: Math.max(0.8, detection.confidence),
        explanation: `حذف آخر عنصر - ${detection.reasoning.join(', ')}`,
        provider: 'التحليل الذكي البديل'
      };
    }
    if (cleanText.includes('كل') || cleanText.includes('جميع')) {
      return {
        isCommand: true,
        commandType: 'delete',
        action: 'حذف جميع المحتوى',
        target: 'all',
        confidence: Math.max(0.9, detection.confidence),
        explanation: `حذف شامل - ${detection.reasoning.join(', ')}`,
        provider: 'التحليل الذكي البديل'
      };
    }

    // Try to extract specific target
    const words = text.split(' ');
    const deleteIndex = words.findIndex(word =>
      word.includes('احذف') || word.includes('امسح') || word.includes('ازل')
    );

    if (deleteIndex !== -1 && deleteIndex < words.length - 1) {
      const target = words.slice(deleteIndex + 1).join(' ').trim();
      if (target) {
        return {
          isCommand: true,
          commandType: 'delete',
          action: `حذف: ${target}`,
          target: target,
          confidence: Math.max(0.7, detection.confidence),
          explanation: `حذف مستهدف - ${detection.reasoning.join(', ')}`,
          provider: 'التحليل الذكي البديل'
        };
      }
    }
  }

  // Enhanced insert commands
  if (cleanText.includes('أضف') || cleanText.includes('ضع') || cleanText.includes('اكتب') ||
      cleanText.includes('أريد') || cleanText.includes('أحتاج')) {

    // Find position indicators
    let position = 'end';
    let target = '';

    if (cleanText.includes('في البداية') || cleanText.includes('في الأول')) {
      position = 'start';
      target = 'start';
    } else if (cleanText.includes('في النهاية') || cleanText.includes('في الآخر')) {
      position = 'end';
      target = 'end';
    } else if (cleanText.includes('بعد')) {
      position = 'after';
      // Try to extract what comes after "بعد"
      const afterMatch = text.match(/بعد\s+([^،.]+)/);
      if (afterMatch) {
        target = afterMatch[1].trim();
      }
    } else if (cleanText.includes('قبل')) {
      position = 'before';
      // Try to extract what comes after "قبل"
      const beforeMatch = text.match(/قبل\s+([^،.]+)/);
      if (beforeMatch) {
        target = beforeMatch[1].trim();
      }
    }

    // Try to extract content to add
    let content = '';
    const contentMatches = [
      text.match(/(?:أضف|ضع|اكتب)\s+([^،.]+)/),
      text.match(/(?:أريد|أحتاج)\s+(?:أن\s+)?(?:أرى|أضع|أكتب)\s+([^،.]+)/),
      text.match(/كلمة\s+([^،.]+)/),
      text.match(/نص\s+([^،.]+)/)
    ];

    for (const match of contentMatches) {
      if (match && match[1]) {
        content = match[1].trim();
        break;
      }
    }

    if (!content) {
      // Extract anything after command words
      const words = text.split(' ');
      const cmdIndex = words.findIndex(word =>
        word.includes('أضف') || word.includes('ضع') || word.includes('أريد')
      );
      if (cmdIndex !== -1) {
        content = words.slice(cmdIndex + 1).join(' ').trim();
      }
    }

    return {
      isCommand: true,
      commandType: 'insert',
      action: `إضافة: ${content || 'محتوى'}`,
      target: target || position,
      content: content || text.trim(),
      position: position,
      confidence: Math.max(0.6, detection.confidence),
      explanation: `إضافة محتوى - ${detection.reasoning.join(', ')}`,
      provider: 'التحليل الذكي البديل'
    };
  }

  // Enhanced format commands
  if (cleanText.includes('عنوان') || cleanText.includes('رأس')) {
    const content = text.replace(/.*عنوان/i, '').trim();
    return {
      isCommand: true,
      commandType: 'format',
      action: 'إضافة عنوان',
      content: content || 'عنوان جديد',
      confidence: Math.max(0.9, detection.confidence),
      explanation: `تنسيق عنوان - ${detection.reasoning.join(', ')}`,
      provider: 'التحليل الذكي البديل'
    };
  }
  
  // Control commands
  if (cleanText.includes('توقف') || cleanText.includes('إيقاف') || cleanText.includes('خلاص') || cleanText.includes('كفاية')) {
    return {
      isCommand: true,
      commandType: 'control',
      action: 'إيقاف التسجيل',
      confidence: 0.95,
      explanation: 'تحليل أساسي - إيقاف',
      provider: 'التحليل الأساسي'
    };
  }
  
  // Default: regular text
  return {
    isCommand: false,
    commandType: null,
    action: 'إدراج النص',
    content: text,
    confidence: 0.9,
    explanation: 'تحليل أساسي - نص عادي',
    provider: 'التحليل الأساسي'
  };
}

// Main analysis function that tries providers in priority order
export const analyzeCommandMultiAI: RequestHandler = async (req, res) => {
  try {
    const { text, context } = req.body as CommandAnalysisRequest;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: "النص مطلوب",
        message: "يجب إرسال نص لتحليله"
      });
    }

    // Get available providers sorted by priority
    const currentProviders = getAIProviders();
    const availableProviders = currentProviders
      .filter(p => p.available)
      .sort((a, b) => a.priority - b.priority);

    console.log(`🤖 Available AI providers: ${availableProviders.map(p => p.displayName).join(', ')}`);

    // Try each provider in order
    for (const provider of availableProviders) {
      let result: CommandAnalysisResponse | null = null;

      switch (provider.name) {
        case 'deepseek':
          result = await tryDeepSeek(text, context);
          break;
        case 'gemini':
          result = await tryGemini(text, context);
          break;
        case 'openai':
          result = await tryOpenAI(text, context);
          break;
        case 'groq':
          result = await tryGroq(text, context);
          break;
      }

      if (result && result.confidence >= 0.7) {
        console.log(`�� Success with ${provider.displayName}`);
        return res.json(result);
      }
    }

    // All AI providers failed, use fallback
    console.log('⚠️ All AI providers failed, using fallback analysis');
    const fallbackResult = fallbackAnalysis(text);
    return res.json(fallbackResult);

  } catch (error) {
    console.error('Multi-AI analysis error:', error);
    const fallbackResult = fallbackAnalysis(req.body.text);
    return res.json(fallbackResult);
  }
};

// Test individual provider
export const testProvider: RequestHandler = async (req, res) => {
  try {
    const { providerName } = req.params;
    const currentProviders = getAIProviders();
    const provider = currentProviders.find(p => p.name === providerName);

    if (!provider) {
      return res.status(404).json({ error: "مقدم الخدمة غير موجود" });
    }

    if (!provider.available) {
      return res.json({
        success: false,
        error: "غير ��كوّن",
        message: `مفتاح ${provider.displayName} غير مكوّن`
      });
    }

    // Test the provider with a simple command
    let result: CommandAnalysisResponse | null = null;

    try {
      switch (provider.name) {
        case 'deepseek':
          result = await tryDeepSeek('اختبار');
          break;
        case 'gemini':
          result = await tryGemini('اختبار');
          break;
        case 'openai':
          result = await tryOpenAI('اختبار');
          break;
        case 'groq':
          result = await tryGroq('اختبار');
          break;
      }

      if (result) {
        res.json({
          success: true,
          message: `${provider.displayName} يعمل بشكل صحيح`,
          confidence: result.confidence,
          response: result.explanation
        });
      } else {
        res.json({
          success: false,
          error: "فشل الاختبار",
          message: `${provider.displayName} لا يستجيب بشكل صحيح`
        });
      }
    } catch (error: any) {
      res.json({
        success: false,
        error: error.message || "خطأ غير معروف",
        message: `خطأ في ${provider.displayName}: ${error.message || 'غير محدد'}`
      });
    }

  } catch (error) {
    res.status(500).json({ error: "خطأ في اختبار مقدم الخد��ة" });
  }
};

// Test API key directly (for user-provided keys)
// Clear/remove API key
export const clearAPIKey: RequestHandler = async (req, res) => {
  try {
    const { providerName } = req.params;

    const validProviders = ['deepseek', 'gemini', 'openai', 'groq', 'claude'];
    if (!validProviders.includes(providerName)) {
      return res.status(404).json({
        success: false,
        error: "مقدم الخدمة غير ��وجود"
      });
    }

    // Remove the API key from runtime storage
    delete runtimeAPIKeys[providerName];
    console.log(`API key cleared for ${providerName}`);

    // Re-initialize AI clients
    initializeAIClients();

    res.json({
      success: true,
      message: `تم مسح مفتاح ${providerName} بنجاح`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error clearing API key:', error);
    res.status(500).json({
      success: false,
      error: "خطأ في مسح مفتاح API"
    });
  }
};

// Save API key after successful test
export const saveAPIKey: RequestHandler = async (req, res) => {
  try {
    const { providerName } = req.params;
    const { apiKey } = req.body;

    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({
        success: false,
        error: "مفتاح API مطلوب"
      });
    }

    const validProviders = ['deepseek', 'gemini', 'openai', 'groq', 'claude'];
    if (!validProviders.includes(providerName)) {
      return res.status(404).json({
        success: false,
        error: "مقدم الخدمة غير موجود"
      });
    }

    // Save the API key in runtime storage
    runtimeAPIKeys[providerName] = apiKey;
    console.log(`API key saved for ${providerName}`);

    // Re-initialize AI clients
    initializeAIClients();

    res.json({
      success: true,
      message: `تم حفظ مفتاح ${providerName} بنجاح`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error saving API key:', error);
    res.status(500).json({
      success: false,
      error: "خ��أ في ��فظ مفتاح API"
    });
  }
};

export const testAPIKeyDirect: RequestHandler = async (req, res) => {
  try {
    console.log(`Testing API key for provider: ${req.params.providerName}`);

    const { providerName } = req.params;
    const { apiKey } = req.body;

    if (!apiKey || !apiKey.trim()) {
      console.log('API key is missing or empty');
      return res.status(400).json({
        success: false,
        error: "مفتاح API مطلوب",
        message: "يرجى إرسال مفتاح API صالح"
      });
    }

    const providerConfig = AI_PROVIDERS.find(p => p.name === providerName);
    if (!providerConfig) {
      console.log(`Provider ${providerName} not found in AI_PROVIDERS`);
      return res.status(404).json({
        success: false,
        error: "مقدم الخدمة غير موجود",
        message: `مقدم الخدمة ${providerName} غي�� مدعوم`
      });
    }

    console.log(`Found provider config for ${providerConfig.displayName}`);

    let result: CommandAnalysisResponse | null = null;

    try {
      // Test the provider with the provided API key
      switch (providerName) {
        case 'deepseek': {
          console.log('Testing DeepSeek API key...');
          try {
            const tempClient = new OpenAI({
              apiKey: apiKey,
              baseURL: 'https://api.deepseek.com/v1',
            });
            const completion = await tempClient.chat.completions.create({
              model: 'deepseek-chat',
              messages: [
                { role: 'system', content: 'أنت مساعد ذكي. رد بكلمة واحدة: "نجح"' },
                { role: 'user', content: 'اختبار' }
              ],
              temperature: 0.1,
              max_tokens: 10,
            });
            const response = completion.choices[0]?.message?.content;
            if (response) {
              result = { isCommand: false, commandType: null, action: 'اختبار نجح', confidence: 1, explanation: 'DeepSeek يعمل' };
              console.log('DeepSeek test successful');
            } else {
              console.log('DeepSeek returned empty response');
            }
          } catch (deepseekError: any) {
            console.error('DeepSeek test failed:', deepseekError.message);
            throw deepseekError;
          }
          break;
        }

        case 'openai': {
          console.log('Testing OpenAI API key...');
          try {
            const tempClient = new OpenAI({
              apiKey: apiKey,
            });
            const completion = await tempClient.chat.completions.create({
              model: 'gpt-3.5-turbo',
              messages: [
                { role: 'system', content: 'You are a helpful assistant. Reply with just one word: "success"' },
                { role: 'user', content: 'test' }
              ],
              temperature: 0.1,
              max_tokens: 10,
            });
            const response = completion.choices[0]?.message?.content;
            if (response) {
              result = { isCommand: false, commandType: null, action: 'اختبار ��جح', confidence: 1, explanation: 'OpenAI يعمل' };
              console.log('OpenAI test successful');
            } else {
              console.log('OpenAI returned empty response');
            }
          } catch (openaiError: any) {
            console.error('OpenAI test failed:', openaiError.message);
            throw openaiError;
          }
          break;
        }

        case 'groq': {
          const tempClient = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://api.groq.com/openai/v1',
          });
          const completion = await tempClient.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [
              { role: 'system', content: 'You are a helpful assistant. Reply with just one word: "success"' },
              { role: 'user', content: 'test' }
            ],
            temperature: 0.1,
            max_tokens: 10,
          });
          const response = completion.choices[0]?.message?.content;
          if (response) {
            result = { isCommand: false, commandType: null, action: 'اختبار نجح', confidence: 1, explanation: 'Groq يعمل' };
          }
          break;
        }

        case 'gemini': {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: 'Reply with just one word: "success"'
                  }]
                }],
                generationConfig: {
                  temperature: 0.1,
                  maxOutputTokens: 10,
                }
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
          }

          const data = await response.json();
          const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;

          if (responseText) {
            result = { isCommand: false, commandType: null, action: 'اختبار نجح', confidence: 1, explanation: 'Gemini يعمل' };
          }
          break;
        }

        case 'claude': {
          const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
              model: 'claude-3-haiku-20240307',
              max_tokens: 10,
              messages: [{
                role: 'user',
                content: 'Reply with just one word: "success"'
              }]
            }),
          });

          if (!response.ok) {
            throw new Error(`Claude API error: ${response.status}`);
          }

          const data = await response.json();
          if (data.content && data.content[0]?.text) {
            result = { isCommand: false, commandType: null, action: 'اختبار نجح', confidence: 1, explanation: 'Claude يعمل' };
          }
          break;
        }

        default:
          return res.status(400).json({
            success: false,
            error: "مقدم خدمة غير مدعوم"
          });
      }

      if (result) {
        console.log(`API key test successful for ${providerConfig.displayName}`);
        return res.json({
          success: true,
          message: `✅ ${providerConfig.displayName} يعمل بشكل صحيح مع المفتاح المقدم`,
          confidence: result.confidence,
          response: result.explanation,
          provider: providerConfig.displayName
        });
      } else {
        console.log(`API key test failed - no result for ${providerConfig.displayName}`);
        return res.json({
          success: false,
          error: "لا توجد استجابة",
          message: `${providerConfig.displayName} لم يرد بش��ل صحيح`
        });
      }

    } catch (error: any) {
      console.error(`Direct API key test failed for ${providerName}:`, error);

      let errorMessage = "خطأ غير معروف";
      if (error.message.includes('401') || error.message.includes('unauthorized')) {
        errorMessage = "مفتاح API غير صحيح أو منتهي الصلاحية";
      } else if (error.message.includes('403') || error.message.includes('forbidden')) {
        errorMessage = "مفتاح API لا يملك الصلاحيات المطلوبة";
      } else if (error.message.includes('404')) {
        errorMessage = "نموذ�� غير ��وجود أو غير متاح";
      } else if (error.message.includes('429')) {
        errorMessage = "تم تجاوز حد الاستخدام، حاول لاحقاً";
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = "خطأ في الاتصال بالخدمة";
      }

      return res.json({
        success: false,
        error: errorMessage,
        message: `❌ فشل اختبار ${providerConfig.displayName}: ${errorMessage}`,
        details: error.message
      });
    }

  } catch (error) {
    console.error('Direct API key test error:', error);

    // Check if response was already sent
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: "خطأ في الخاد��",
        message: "حدث خطأ أثناء اختبار مفتاح API"
      });
    }
  }
};

// Analyze with specific provider
export const analyzeWithProvider: RequestHandler = async (req, res) => {
  try {
    const { providerName } = req.params;
    const { text, context } = req.body as CommandAnalysisRequest;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: "النص مطلوب",
        message: "يجب إ���سال نص لتحليله"
      });
    }

    const currentProviders = getAIProviders();
    const provider = currentProviders.find(p => p.name === providerName);

    if (!provider) {
      return res.status(404).json({ error: "مقدم الخدمة غير موجود" });
    }

    if (!provider.available) {
      return res.status(503).json({
        error: "مقدم الخدمة غير متاح",
        message: `${provider.displayName} غير مكوّن أو لا ��عمل`
      });
    }

    let result: CommandAnalysisResponse | null = null;

    switch (provider.name) {
      case 'deepseek':
        result = await tryDeepSeek(text, context);
        break;
      case 'gemini':
        result = await tryGemini(text, context);
        break;
      case 'openai':
        result = await tryOpenAI(text, context);
        break;
      case 'groq':
        result = await tryGroq(text, context);
        break;
    }

    if (result) {
      res.json(result);
    } else {
      // Fallback to basic analysis
      const fallbackResult = fallbackAnalysis(text);
      fallbackResult.explanation = `فشل ${provider.displayName} - تم استخدام التحليل ��لأساسي`;
      res.json(fallbackResult);
    }

  } catch (error) {
    console.error('Provider-specific analysis error:', error);
    const fallbackResult = fallbackAnalysis(req.body.text);
    fallbackResult.explanation = "خطأ في الذكاء الاصطناعي - تم استخدام التحليل الأساسي";
    res.json(fallbackResult);
  }
};

// Get provider status (lightweight version without actual testing to avoid hanging)
export const getProviderStatus: RequestHandler = async (req, res) => {
  console.log('Getting provider status...');

  try {
    // Set headers for better caching control
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // Return status based on current configuration (env + runtime keys)
    // Actual testing will be done on-demand when user clicks test button
    const currentProviders = getAIProviders();
    const basicStatus = currentProviders.map(provider => ({
      name: provider.name,
      displayName: provider.displayName,
      available: provider.available,
      priority: provider.priority,
      configured: provider.available,
      working: provider.available, // Assume working if configured
      error: provider.available ? null : "غير م��وّن",
      lastTested: provider.available ? new Date().toISOString() : null,
      source: runtimeAPIKeys[provider.name] ? 'runtime' : 'environment' // للمطورين فقط
    }));

    const response = {
      providers: basicStatus,
      totalAvailable: basicStatus.filter(p => p.available).length,
      totalWorking: basicStatus.filter(p => p.working).length,
      timestamp: new Date().toISOString()
    };

    console.log('Provider status response:', response);
    res.json(response);

  } catch (error) {
    console.error('Error getting provider status:', error);

    // Ensure we don't send response twice
    if (!res.headersSent) {
      const currentProviders = getAIProviders();
      const fallbackResponse = {
        error: 'خطأ في جلب حالة مقدمي الخدمات',
        providers: currentProviders.map(p => ({
          name: p.name,
          displayName: p.displayName,
          available: p.available,
          priority: p.priority,
          configured: p.available,
          working: false,
          error: 'خطأ في النظام',
          lastTested: null
        })),
        totalAvailable: currentProviders.filter(p => p.available).length,
        totalWorking: 0,
        timestamp: new Date().toISOString()
      };

      res.status(500).json(fallbackResponse);
    }
  }
};

import { RequestHandler } from "express";
import OpenAI from "openai";

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
}

// Initialize OpenAI client
let openai: OpenAI | null = null;

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
} catch (error) {
  console.warn('OpenAI initialization failed:', error);
}

// Hugging Face API integration (Free alternative)
const HUGGING_FACE_API = 'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium';

async function analyzeWithHuggingFace(text: string, context?: string): Promise<CommandAnalysisResponse> {
  const prompt = `التحليل: "${text}"
هل هذا أمر أم نص عادي؟
الأوامر: امسح، احذف، أضف، اكتب، عنوان، توقف، استمرار
إذا كان أمر اكتب: {"isCommand": true, "commandType": "نوع_الأمر", "action": "الوصف"}
إذا كان نص عادي اكتب: {"isCommand": false, "action": "إدراج النص"}`;

  try {
    const response = await fetch(HUGGING_FACE_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.HUGGING_FACE_TOKEN || 'hf_free'}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 100,
          temperature: 0.3,
        }
      }),
    });

    if (response.ok) {
      const result = await response.json();
      // Parse the result and return structured response
      return parseHuggingFaceResponse(result, text);
    }
  } catch (error) {
    console.log('Hugging Face API failed:', error);
  }

  // Fallback to basic analysis
  return fallbackAnalysis(text);
}

function parseHuggingFaceResponse(result: any, originalText: string): CommandAnalysisResponse {
  try {
    // Try to extract JSON from the response
    const responseText = result[0]?.generated_text || '';
    const jsonMatch = responseText.match(/\{[^}]+\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isCommand: Boolean(parsed.isCommand),
        commandType: parsed.commandType || null,
        action: parsed.action || 'إدراج النص',
        confidence: 0.8,
        explanation: 'تحليل بواسطة Hugging Face (مجاني)',
        content: parsed.isCommand ? undefined : originalText
      };
    }
  } catch (error) {
    console.log('Failed to parse Hugging Face response');
  }

  return fallbackAnalysis(originalText);
}

export const analyzeCommand: RequestHandler = async (req, res) => {
  try {
    const { text, context } = req.body as CommandAnalysisRequest;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        error: "النص مطلوب",
        message: "يجب إرسال نص لتحليله"
      });
    }

    // Try free alternatives first, then OpenAI

    // Option 1: Try Hugging Face (Free)
    try {
      const huggingFaceResult = await analyzeWithHuggingFace(text, context);
      if (huggingFaceResult.confidence >= 0.7) {
        return res.json(huggingFaceResult);
      }
    } catch (error) {
      console.log('Hugging Face failed, trying OpenAI...');
    }

    // Option 2: Try OpenAI (Paid)
    if (!openai) {
      // No AI available, use fallback
      const fallbackResult = fallbackAnalysis(text);
      fallbackResult.explanation = "تحليل أساسي - لا توجد خدمة ذكاء اصطناعي متاحة";
      return res.json(fallbackResult);
    }

    const systemPrompt = `أنت مساعد ذكي ��تخصص في تحليل الأوامر الصوتية العربية للتحكم في الوثائق.

مهمتك: تحليل النص المرسل وتحديد ما إذا كان:
1. أمراً للتحكم في الوثيقة (حذف، إضافة، تعديل، تنسيق)
2. نصاً عادياً يجب إدراجه في الوثيقة

أنواع الأوامر:
- delete: أوامر الحذف (امسح، احذف، إزالة)
- insert: أوامر الإضافة (أضف، اكتب)
- replace: أوامر الاستبدال (استبدل، غير، بدّل)
- format: أوامر التنسيق (عنوان، فقرة، قائمة)
- control: أوامر التحكم (توقف، استمرار، حفظ)

الرد يجب أن يكون JSON فقط بالتنسيق التالي:
{
  "isCommand": boolean,
  "commandType": "insert|delete|replace|format|control|null",
  "action": "وصف دقيق للعمل المطلوب",
  "target": "الهدف المحدد للأمر (اختياري)",
  "content": "المحتوى المطلوب إضافته أو استخدامه (اختياري)",
  "replacement": "النص البديل في حالة الاستبدال (اختياري)",
  "confidence": رقم من 0 إلى 1,
  "explanation": "شرح مختصر للقرار"
}`;

    const userPrompt = `النص المراد تحليله: "${text}"
${context ? `السياق الحالي: "${context}"` : ''}

حلل هذا النص وحدد ما إذا كان أمراً أم نصاً عادياً.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText = completion.choices[0]?.message?.content;
    
    if (!responseText) {
      throw new Error("لم يتم الحصول على رد من الذكاء الاصطناعي");
    }

    // Parse JSON response
    let openaiResult: CommandAnalysisResponse;
    try {
      openaiResult = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', responseText);
      // Fallback to basic analysis
      openaiResult = fallbackAnalysis(text);
    }

    // Validate and sanitize response
    const validatedResult: CommandAnalysisResponse = {
      isCommand: Boolean(openaiResult.isCommand),
      commandType: openaiResult.commandType || null,
      action: openaiResult.action || "إدراج النص",
      target: openaiResult.target,
      content: openaiResult.content,
      replacement: openaiResult.replacement,
      confidence: Math.max(0, Math.min(1, openaiResult.confidence || 0.5)),
      explanation: openaiResult.explanation || "تم التحليل باستخدام الذكاء الاصطناعي"
    };

    res.json(validatedResult);

  } catch (error) {
    console.error('AI command analysis error:', error);
    
    // Fallback to basic analysis
    const fallbackResult = fallbackAnalysis(req.body.text);
    
    res.status(200).json({
      ...fallbackResult,
      explanation: "تم استخدام التحليل الأساسي بسبب خطأ في الذكاء الاصطناعي"
    });
  }
};

// Fallback analysis function (basic pattern matching)
function fallbackAnalysis(text: string): CommandAnalysisResponse {
  const cleanText = text.toLowerCase().trim();
  
  // Delete commands
  if (cleanText.includes('امسح') || cleanText.includes('احذف') || cleanText.includes('إزالة')) {
    if (cleanText.includes('آخر') || cleanText.includes('أخير')) {
      return {
        isCommand: true,
        commandType: 'delete',
        action: 'حذف آخر فقرة',
        target: 'last',
        confidence: 0.8,
        explanation: 'تم اكتشاف أمر حذف آخر عنصر'
      };
    }
    if (cleanText.includes('كل') || cleanText.includes('جميع')) {
      return {
        isCommand: true,
        commandType: 'delete',
        action: 'حذف جميع المحتوى',
        target: 'all',
        confidence: 0.9,
        explanation: 'تم اكتشاف أمر حذف جميع المحتوى'
      };
    }
    return {
      isCommand: true,
      commandType: 'delete',
      action: 'حذف النص المحدد',
      target: 'selection',
      confidence: 0.7,
      explanation: 'تم اكتشاف أمر حذف'
    };
  }
  
  // Replace commands
  if (cleanText.includes('استبدل') || cleanText.includes('غير') || cleanText.includes('بدّل')) {
    return {
      isCommand: true,
      commandType: 'replace',
      action: 'استبدال النص',
      confidence: 0.8,
      explanation: 'تم اكتشاف أمر استبدال'
    };
  }
  
  // Format commands
  if (cleanText.includes('عنوان') || cleanText.includes('رأس')) {
    const content = text.replace(/.*عنوان/i, '').trim();
    return {
      isCommand: true,
      commandType: 'format',
      action: 'إضافة عنوان',
      content: content || 'عنوان جديد',
      confidence: 0.9,
      explanation: 'تم اكتشاف أمر إضافة عنو��ن'
    };
  }
  
  // Control commands
  if (cleanText.includes('توقف') || cleanText.includes('إيقاف')) {
    return {
      isCommand: true,
      commandType: 'control',
      action: 'إيقاف التسجيل',
      confidence: 0.95,
      explanation: 'تم اكتشاف أمر إيقاف'
    };
  }
  
  if (cleanText.includes('استمرار') || cleanText.includes('مستمر')) {
    return {
      isCommand: true,
      commandType: 'control',
      action: 'تفعيل الوضع المستمر',
      confidence: 0.9,
      explanation: 'تم اكتشاف أمر الوضع المستمر'
    };
  }
  
  // Add commands
  if (cleanText.includes('أضف') || cleanText.includes('اكتب')) {
    const content = text.replace(/^(أضف|اكتب)\s*/i, '').trim();
    return {
      isCommand: Boolean(content),
      commandType: content ? 'insert' : null,
      action: content ? 'إضافة نص' : 'إدراج النص',
      content: content || text,
      confidence: content ? 0.8 : 0.3,
      explanation: content ? 'تم اكتشاف أمر إضافة نص' : 'يبدو أنه نص عادي'
    };
  }
  
  // Default: treat as regular text
  return {
    isCommand: false,
    commandType: null,
    action: 'إدراج النص',
    content: text,
    confidence: 0.9,
    explanation: 'النص يبدو كنص عادي للإدراج'
  };
}

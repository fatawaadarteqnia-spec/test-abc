import { useState } from 'react';
import { Settings, Key, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface AIConfigDialogProps {
  isAIAvailable: boolean;
}

export function AIConfigDialog({ isAIAvailable }: AIConfigDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [isTestingKey, setIsTestingKey] = useState(false);
  const { toast } = useToast();

  const testAPIKey = async () => {
    if (!apiKey.trim()) {
      toast({
        title: "مفتاح API مطلوب",
        description: "يرجى إدخال مفتاح OpenAI API",
        variant: "destructive",
      });
      return;
    }

    setIsTestingKey(true);

    try {
      const response = await fetch('/api/analyze-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey, // This would need to be handled on the server
        },
        body: JSON.stringify({
          text: 'اختبار الاتصال',
          context: ''
        }),
      });

      if (response.ok) {
        toast({
          title: "نجح الاختبار!",
          description: "مفتاح API يعمل بشكل صحيح",
        });
        setIsOpen(false);
      } else {
        throw new Error('فشل في الاختبار');
      }
    } catch (error) {
      toast({
        title: "فشل الاختبار",
        description: "تحقق من صحة مفتاح API وإعدادات الخادم",
        variant: "destructive",
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="arabic-text">
          <Settings className="w-4 h-4 ml-1" />
          إعدادات الذكاء الاصطناعي
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="arabic-text flex items-center gap-2">
            <Key className="w-5 h-5" />
            إعداد الذكاء الاصطناعي
          </DialogTitle>
          <DialogDescription className="arabic-text">
            قم بتكوين مفتاح OpenAI API للحصول على تحليل ذكي للأوامر الصوتية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <Alert>
            {isAIAvailable ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-600" />
            )}
            <AlertDescription className="arabic-text">
              {isAIAvailable 
                ? "الذكاء الاصطناعي مفعل ويعمل بشكل صحيح" 
                : "الذكاء الاصطناعي غير مكوّن - يتم استخدام ال��حليل الأساسي"}
            </AlertDescription>
          </Alert>

          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="arabic-text">
              مفتاح OpenAI API
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono"
              dir="ltr"
            />
          </div>

          {/* Instructions */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="arabic-text text-sm">
              <strong>كيفية الحصول على مفتاح API:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>انتقل إلى platform.openai.com</li>
                <li>قم بإنشاء حساب أو تسجيل الدخول</li>
                <li>انتقل إلى API Keys</li>
                <li>أنشئ مفتاح جديد</li>
                <li>انسخ المفتاح هنا</li>
              </ol>
            </AlertDescription>
          </Alert>

          {/* Note about server configuration */}
          <Alert>
            <AlertCircle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="arabic-text text-sm">
              <strong>ملاحظة:</strong> يجب تكوين المفتاح في متغيرات البيئة على الخادم. 
              راجع ملف AI_SETUP.md للتعليمات التفصيلية.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter className="flex-col gap-2">
          <Button 
            onClick={testAPIKey} 
            disabled={isTestingKey || !apiKey.trim()}
            className="w-full arabic-text"
          >
            {isTestingKey ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />
                جاري الاختبار...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 ml-1" />
                اختبار الاتصال
              </>
            )}
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="w-full arabic-text"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

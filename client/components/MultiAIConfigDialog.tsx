import { useState, useEffect } from 'react';
import { Settings, Key, CheckCircle, AlertCircle, Info, Brain, Zap, Globe } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface AIProvider {
  name: string;
  displayName: string;
  available: boolean;
  priority: number;
  configured: boolean;
  working: boolean;
  error: string | null;
  lastTested: string | null;
}

interface AIStatus {
  providers: AIProvider[];
  totalAvailable: number;
  totalWorking: number;
}

const AI_PROVIDER_CONFIGS = [
  {
    name: 'deepseek',
    displayName: 'DeepSeek',
    description: 'مجاني مع حد أدنى من القيود',
    icon: '🚀',
    website: 'https://platform.deepseek.com',
    envKey: 'DEEPSEEK_API_KEY',
    placeholder: 'sk-...',
    color: 'bg-blue-500'
  },
  {
    name: 'gemini',
    displayName: 'Google Gemini',
    description: 'سريع ودقيق من Google',
    icon: '🔮',
    website: 'https://makersuite.google.com/app/apikey',
    envKey: 'GEMINI_API_KEY',
    placeholder: 'AIza...',
    color: 'bg-green-500'
  },
  {
    name: 'openai',
    displayName: 'OpenAI GPT',
    description: 'الأكثر شهرة لكن مدفوع',
    icon: '🤖',
    website: 'https://platform.openai.com/api-keys',
    envKey: 'OPENAI_API_KEY',
    placeholder: 'sk-proj-...',
    color: 'bg-purple-500'
  },
  {
    name: 'groq',
    displayName: 'Groq',
    description: 'سريع جداً مع نماذج مجانية',
    icon: '⚡',
    website: 'https://console.groq.com/keys',
    envKey: 'GROQ_API_KEY',
    placeholder: 'gsk_...',
    color: 'bg-orange-500'
  },
  {
    name: 'claude',
    displayName: 'Anthropic Claude',
    description: 'ذكي جداً للمهام المعقدة',
    icon: '🧠',
    website: 'https://console.anthropic.com',
    envKey: 'ANTHROPIC_API_KEY',
    placeholder: 'sk-ant-...',
    color: 'bg-indigo-500'
  }
];

interface MultiAIConfigDialogProps {
  aiStatus: AIStatus | null;
  onConfigUpdate?: () => void;
  selectedProvider?: string;
  onProviderSelect?: (provider: string) => void;
}

export function MultiAIConfigDialog({ aiStatus, onConfigUpdate, selectedProvider: propSelectedProvider, onProviderSelect }: MultiAIConfigDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({});
  const [isTestingKeys, setIsTestingKeys] = useState<{ [key: string]: boolean }>({});
  const [selectedProvider, setSelectedProvider] = useState<string>('auto');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Simple and stable dialog state management
  const handleDialogOpenChange = (open: boolean) => {
    console.log('Dialog state changing to:', open);
    try {
      setIsOpen(open);
      if (open) {
        console.log('Dialog opened successfully');
      }
    } catch (error) {
      console.error('Error changing dialog state:', error);
    }
  };

  const fetchAIStatus = async () => {
    if (!isOpen) return; // Don't fetch if dialog is not open

    setIsRefreshing(true);
    try {
      const response = await fetch('/api/ai-status');
      if (response.ok) {
        const status = await response.json();
        console.log('AI Status fetched:', status);
        // Trigger parent update if needed
        onConfigUpdate?.();
      }
    } catch (error) {
      console.error('Failed to fetch AI status:', error);
      // Silent failure - don't show toast that might interfere with dialog
    } finally {
      setIsRefreshing(false);
    }
  };

  const testIndividualProvider = async (providerName: string) => {
    setIsTestingKeys(prev => ({ ...prev, [providerName]: true }));

    try {
      const response = await fetch(`/api/test-provider/${providerName}`, {
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: "✅ نجح الاختبار",
          description: result.message,
        });
      } else {
        toast({
          title: "❌ فشل الاختبار",
          description: result.message || "غير محدد",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Provider test error:', error);
      toast({
        title: "خطأ في الاختبار",
        description: "حدث خطأ ��ثناء اختبار مقدم الخدمة",
        variant: "destructive",
      });
    } finally {
      setIsTestingKeys(prev => ({ ...prev, [providerName]: false }));
    }
  };

  const testAPIKey = async (providerName: string) => {
    const apiKey = apiKeys[providerName];
    if (!apiKey?.trim()) {
      toast({
        title: "مفتاح API مطلوب",
        description: `يرجى إدخال مفتاح ${AI_PROVIDER_CONFIGS.find(p => p.name === providerName)?.displayName}`,
        variant: "destructive",
      });
      return;
    }

    setIsTestingKeys(prev => ({ ...prev, [providerName]: true }));

    try {
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`/api/test-api-key/${providerName}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKey
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Check if response is ok before reading body
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Read the response body only once
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        throw new Error('خطأ في تحليل الاستجابة من الخادم');
      }

      if (result && result.success) {
        // Save the API key after successful test
        try {
          const saveResponse = await fetch(`/api/save-api-key/${providerName}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              apiKey: apiKey
            }),
          });

          if (saveResponse.ok) {
            toast({
              title: "✅ نجح الاختبار والحفظ!",
              description: result.message || "تم حفظ المفتاح وهو يعمل بشكل صحيح",
            });

            // Refresh the status to show updated configuration
            setTimeout(() => {
              fetchAIStatus();
            }, 500);
          } else {
            toast({
              title: "✅ نجح الاختبار",
              description: "المفتاح يعمل لكن لم يتم حفظه. يرجى إعادة تشغيل الخادم لحفظه نهائياً",
            });
          }
        } catch (saveError) {
          console.error('Failed to save API key:', saveError);
          toast({
            title: "✅ نجح الاختبار",
            description: "المفتاح يعمل لكن لم يتم حفظه بشكل دائم",
          });
        }
      } else {
        toast({
          title: "❌ فشل الاختبار",
          description: result?.message || result?.error || "خطأ غير محدد",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('API key test error:', error);

      // Provide more specific error messages
      let errorMessage = "حدث خطأ أثناء اختبار مفتاح API";
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = "انتهت مهلة الاختبار - يرجى المحاولة مرة أخرى";
        } else if (error.message.includes('Failed to fetch')) {
          errorMessage = "خطأ في الاتصال بالخادم";
        } else if (error.message.includes('HTTP 4')) {
          errorMessage = "مفتاح API غير صحيح أو غير صالح";
        } else if (error.message.includes('HTTP 5')) {
          errorMessage = "خطأ في الخادم، حاول مرة أخرى";
        } else if (error.message.includes('body stream already read')) {
          errorMessage = "خطأ في قراءة الاستجابة - يرجى إعادة ا��محاولة";
        } else if (error.message.length > 0) {
          errorMessage = error.message;
        }
      }

      toast({
        title: "خطأ في الاختبار",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTestingKeys(prev => ({ ...prev, [providerName]: false }));
    }
  };

  const copyConfigCommand = (provider: any) => {
    const command = `${provider.envKey}=${apiKeys[provider.name] || 'your_api_key_here'}`;
    navigator.clipboard.writeText(command);
    toast({
      title: "تم النسخ!",
      description: "تم نسخ ��مر التكوين إلى الحافظة",
    });
  };

  const getProviderInfo = (providerName: string) => {
    return aiStatus?.providers?.find(p => p.name === providerName) || {
      available: false,
      configured: false,
      working: false,
      error: 'غير متاح'
    };
  };

  const getStatusBadge = (provider: AIProvider) => {
    if (!provider.configured) {
      return <Badge variant="secondary" className="arabic-text">غير مكوّن</Badge>;
    }
    if (provider.working) {
      return <Badge variant="default" className="arabic-text">✅ يعمل</Badge>;
    }
    if (provider.error) {
      return <Badge variant="destructive" className="arabic-text">❌ خطأ</Badge>;
    }
    return <Badge variant="secondary" className="arabic-text">غير مختبر</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="arabic-text">
          <Settings className="w-4 h-4 ml-1" />
          إعدادات الذكاء ا��اصطناعي
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="arabic-text flex items-center gap-2">
            <Brain className="w-5 h-5" />
            إعداد مقدمي خدمات الذكاء الاصطناعي
          </DialogTitle>
          <DialogDescription className="arabic-text">
            قم بتكوين مفاتيح متعددة للحصول على أفضل تجربة وموثوقية
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <Alert>
            {(aiStatus?.totalWorking || 0) > 0 ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-600" />
            )}
            <AlertDescription className="arabic-text">
              {(aiStatus?.totalWorking || 0) > 0
                ? `يعمل ${aiStatus?.totalWorking} من أصل ${aiStatus?.totalAvailable} مقدم خدمة`
                : "لا يوجد مقدم خدمة يعمل - يتم استخدام التحليل الأساس��"}
            </AlertDescription>
          </Alert>

          {/* Refresh Status */}
          <div className="flex justify-between items-center">
            <Button
              onClick={() => {
                console.log('Refresh button clicked');
                fetchAIStatus();
              }}
              disabled={isRefreshing}
              variant="outline"
              size="sm"
              className="arabic-text"
            >
              {isRefreshing ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin ml-1" />
              ) : (
                <Settings className="w-4 h-4 ml-1" />
              )}
              تحديث الحالة
            </Button>
            <div className="text-sm text-gray-500">
              {isOpen ? 'الحوار مفتو��' : 'الحوار مغلق'}
            </div>
          </div>

          <Tabs defaultValue="status" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="status" className="arabic-text">
                <CheckCircle className="w-4 h-4 ml-1" />
                حالة الخدمات
              </TabsTrigger>
              <TabsTrigger value="providers" className="arabic-text">
                <Key className="w-4 h-4 ml-1" />
                إعداد المفاتيح
              </TabsTrigger>
              <TabsTrigger value="instructions" className="arabic-text">
                <Info className="w-4 h-4 ml-1" />
                التعليمات
              </TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="space-y-4">
              <div className="grid gap-4">
                {AI_PROVIDER_CONFIGS.map((providerConfig) => {
                  const providerInfo = getProviderInfo(providerConfig.name);
                  return (
                    <div key={providerConfig.name} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${providerConfig.color} flex items-center justify-center text-white text-sm`}>
                            {providerConfig.icon}
                          </div>
                          <div>
                            <h3 className="font-semibold arabic-text">{providerConfig.displayName}</h3>
                            <p className="text-sm text-gray-600 arabic-text">{providerConfig.description}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {getStatusBadge(providerInfo)}

                          <Button
                            onClick={() => testIndividualProvider(providerConfig.name)}
                            disabled={isTestingKeys[providerConfig.name] || !providerInfo.configured}
                            variant="outline"
                            size="sm"
                            className="arabic-text"
                          >
                            {isTestingKeys[providerConfig.name] ? (
                              <div className="w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Zap className="w-3 h-3 ml-1" />
                            )}
                            اختبار
                          </Button>
                        </div>
                      </div>

                      {/* Error Details */}
                      {providerInfo.error && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription className="arabic-text text-sm">
                            <strong>المشكلة:</strong> {providerInfo.error}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Last Tested */}
                      {providerInfo.lastTested && (
                        <p className="text-xs text-gray-500 arabic-text mt-2">
                          آخر اختبار: {new Date(providerInfo.lastTested).toLocaleString('ar-SA')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Provider Selection */}
              <div className="border rounded-lg p-4 bg-blue-50 dark:bg-blue-900/20">
                <h4 className="font-semibold mb-3 arabic-text">اختيار مقدم الخدمة</h4>
                <div className="space-y-2">
                  <Label className="arabic-text">مقدم الخدمة المفضل:</Label>
                  <select
                    value={propSelectedProvider || selectedProvider}
                    onChange={(e) => {
                      setSelectedProvider(e.target.value);
                      onProviderSelect?.(e.target.value);
                    }}
                    className="w-full p-2 border rounded-md arabic-text"
                  >
                    <option value="auto">تلقائي (حسب الأولوية)</option>
                    {aiStatus?.providers?.filter(p => p.working).map(provider => (
                      <option key={provider.name} value={provider.name}>
                        {AI_PROVIDER_CONFIGS.find(c => c.name === provider.name)?.displayName}
                      </option>
                    ))}
                  </select>
                  <p className="text-sm text-gray-600 arabic-text">
                    {(propSelectedProvider || selectedProvider) === 'auto'
                      ? 'سيتم اختيار أفضل خدمة متا��ة تلقائياً'
                      : `سيتم استخدام ${AI_PROVIDER_CONFIGS.find(c => c.name === (propSelectedProvider || selectedProvider))?.displayName} فقط`
                    }
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="providers" className="space-y-4">
              <div className="grid gap-4">
                {AI_PROVIDER_CONFIGS.map((provider) => (
                  <div key={provider.name} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full ${provider.color} flex items-center justify-center text-white text-sm`}>
                          {provider.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold arabic-text">{provider.displayName}</h3>
                          <p className="text-sm text-gray-600 arabic-text">{provider.description}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {getStatusBadge(getProviderInfo(provider.name))}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(provider.website, '_blank')}
                          className="arabic-text"
                        >
                          <Globe className="w-3 h-3 ml-1" />
                          الحصول على مفتاح
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={provider.name} className="arabic-text">
                        مفتاح {provider.displayName}
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id={provider.name}
                          type="password"
                          placeholder={provider.placeholder}
                          value={apiKeys[provider.name] || ''}
                          onChange={(e) => setApiKeys(prev => ({ ...prev, [provider.name]: e.target.value }))}
                          className="font-mono"
                          dir="ltr"
                        />
                        <Button
                          onClick={() => testAPIKey(provider.name)}
                          disabled={isTestingKeys[provider.name] || !apiKeys[provider.name]?.trim()}
                          size="sm"
                          className="arabic-text whitespace-nowrap"
                        >
                          {isTestingKeys[provider.name] ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 ml-1" />
                              اختبار
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => copyConfigCommand(provider)}
                          variant="outline"
                          size="sm"
                          className="arabic-text"
                        >
                          نسخ
                        </Button>
                      </div>
                      
                      <p className="text-xs text-gray-500 arabic-text">
                        متغير البيئة: <code className="bg-gray-100 px-1 rounded">{provider.envKey}</code>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="instructions" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="arabic-text">
                  <strong>ترتيب الأولوية:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>🚀 DeepSeek (مجاني ومُوصى به)</li>
                    <li>🔮 Google Gemini (سريع ودقيق)</li>
                    <li>🤖 OpenAI GPT (مدفوع لكن موثوق)</li>
                    <li>⚡ Groq (سريع جداً)</li>
                    <li>🧠 Claude (للمهام المع��دة)</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <Alert>
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="arabic-text">
                  <strong>كيفية التكوين:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>احصل على مفتاح من أي مقدم خدمة</li>
                    <li>أدخل المفتاح في الحقل المناسب</li>
                    <li>اختبر الاتصال</li>
                    <li>انسخ متغير البيئة وأضفه لإعدادات الخادم</li>
                    <li>أعد تشغيل الخادم</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <Alert>
                <Zap className="h-4 w-4 text-green-600" />
                <AlertDescription className="arabic-text">
                  <strong>المزايا:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>تبديل تلقائي بين الخدمات عند الفشل</li>
                    <li>اختيار أفضل مقدم خدمة حسب الأولوية</li>
                    <li>عمل مستمر حتى لو فشل مقدم واحد</li>
                    <li>توفير في التكلفة بالاعتماد على الخدمات المجانية</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          <Button
            onClick={() => {
              setIsOpen(false);
              onConfigUpdate?.();
            }}
            className="w-full arabic-text"
          >
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  Code,
  Clock,
  Brain,
  Server,
  AlertCircle,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

interface RequestAnalysis {
  timestamp: string;
  text: string;
  context: string;
  selectedProvider: string;
  endpoint: string;
  fullRequest: any;
  processingSteps?: string[];
  preprocessedText?: string;
  systemPrompt?: string;
}

interface ResponseAnalysis {
  timestamp: string;
  status: number;
  result?: any;
  error?: string;
  request: RequestAnalysis;
  rawResponse?: string;
  processingTime?: number;
  headers?: any;
}

interface DetailedRequestAnalyzerProps {
  lastRequest: RequestAnalysis | null;
  lastResponse: ResponseAnalysis | null;
  isVisible: boolean;
  onToggle: () => void;
}

export function DetailedRequestAnalyzer({
  lastRequest,
  lastResponse,
  isVisible,
  onToggle,
}: DetailedRequestAnalyzerProps) {
  const [expandedSections, setExpandedSections] = useState<{
    [key: string]: boolean;
  }>({
    request: true,
    response: true,
    systemPrompt: false,
    timeline: false,
    analysis: true,
  });
  const { toast } = useToast();

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "تم النسخ!",
        description: `تم نسخ ${label} إلى الحافظة`,
      });
    } catch (error) {
      toast({
        title: "خطأ في النسخ",
        description: "فشل في نسخ النص",
        variant: "destructive",
      });
    }
  };

  const formatJSON = (obj: any) => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  };

  const getStatusColor = (status: number) => {
    if (status >= 200 && status < 300) return "text-green-600";
    if (status >= 400 && status < 500) return "text-yellow-600";
    if (status >= 500) return "text-red-600";
    return "text-gray-600";
  };

  const getProcessingSteps = () => {
    if (!lastRequest || !lastResponse) return [];

    const steps = [
      {
        step: 1,
        name: "استقبال الطلب",
        timestamp: lastRequest.timestamp,
        status: "completed",
        details: `النص المدخل: "${lastRequest.text}"`,
      },
      {
        step: 2,
        name: "تحليل السياق",
        timestamp: lastRequest.timestamp,
        status: "completed",
        details: `السياق المرفق: "${lastRequest.context || "لا يوجد"}"`,
      },
      {
        step: 3,
        name: "اختيار مقدم الخدمة",
        timestamp: lastRequest.timestamp,
        status: "completed",
        details: `المقدم المختار: ${lastRequest.selectedProvider}`,
      },
      {
        step: 4,
        name: "إرسال للذكاء الاصطناعي",
        timestamp: lastRequest.timestamp,
        status: "completed",
        details: `المسار: ${lastRequest.endpoint}`,
      },
      {
        step: 5,
        name: "معالجة الاستجابة",
        timestamp: lastResponse.timestamp,
        status: lastResponse.error ? "error" : "completed",
        details:
          lastResponse.error || `تم بنجاح - الحالة: ${lastResponse.status}`,
      },
    ];

    return steps;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 arabic-text">
            <Brain className="w-5 h-5" />
            🔬 محلل الطلبات المتقدم
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={onToggle}
            className="arabic-text"
          >
            {isVisible ? (
              <>
                <Eye className="w-4 h-4 ml-1" />
                إخفاء
              </>
            ) : (
              <>
                <Code className="w-4 h-4 ml-1" />
                عرض التفاصيل
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {isVisible && (
        <CardContent className="space-y-4">
          {!lastRequest && !lastResponse ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="arabic-text">
                لا توجد طلبات حتى الآن. قم بإرسال أمر صوتي أو نصي لرؤية
                التفاصيل.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview" className="arabic-text">
                  نظرة عامة
                </TabsTrigger>
                <TabsTrigger value="request" className="arabic-text">
                  الطلب
                </TabsTrigger>
                <TabsTrigger value="response" className="arabic-text">
                  الاستجابة
                </TabsTrigger>
                <TabsTrigger value="timeline" className="arabic-text">
                  الخط الزمني
                </TabsTrigger>
                <TabsTrigger value="raw" className="arabic-text">
                  البيانات الخام
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Request Summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm arabic-text">
                        📤 ملخص الطلب
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      {lastRequest && (
                        <>
                          <div>
                            <strong>ال��ص:</strong>
                            <p className="bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                              "{lastRequest.text}"
                            </p>
                          </div>
                          <div>
                            <strong>المقدم:</strong>{" "}
                            {lastRequest.selectedProvider}
                          </div>
                          <div>
                            <strong>الوقت:</strong>{" "}
                            {new Date(lastRequest.timestamp).toLocaleString(
                              "ar-SA",
                            )}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Response Summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm arabic-text">
                        📥 ملخص الاستجابة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      {lastResponse && (
                        <>
                          <div className="flex items-center gap-2">
                            <strong>الحالة:</strong>
                            <Badge
                              variant={
                                lastResponse.error ? "destructive" : "default"
                              }
                            >
                              {lastResponse.error ? "خطأ" : "نجح"}
                            </Badge>
                          </div>
                          {lastResponse.result && (
                            <>
                              <div>
                                <strong>نوع الأمر:</strong>{" "}
                                {lastResponse.result.commandType || "غير محدد"}
                              </div>
                              <div>
                                <strong>الثقة:</strong>{" "}
                                {Math.round(
                                  (lastResponse.result.confidence || 0) * 100,
                                )}
                                %
                              </div>
                            </>
                          )}
                          <div>
                            <strong>وقت المعالجة:</strong>{" "}
                            {lastResponse.processingTime || "غير محدد"}ms
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Analysis Summary */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm arabic-text">
                        🧠 تحليل ذكي
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="text-xs space-y-2">
                      {lastResponse?.result && (
                        <>
                          <div>
                            <strong>العمل:</strong>
                            <p className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded mt-1">
                              {lastResponse.result.action}
                            </p>
                          </div>
                          <div>
                            <strong>التفسير:</strong>
                            <p className="bg-green-50 dark:bg-green-900/20 p-2 rounded mt-1">
                              {lastResponse.result.explanation}
                            </p>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="request" className="space-y-4">
                {lastRequest && (
                  <div className="space-y-4">
                    {/* Request Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm arabic-text flex items-center justify-between">
                          📋 تفاصيل الطلب
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              copyToClipboard(
                                formatJSON(lastRequest.fullRequest),
                                "تفاصيل الطلب",
                              )
                            }
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs">
                        <div className="space-y-3">
                          <div>
                            <strong>HTTP Method:</strong> POST
                          </div>
                          <div>
                            <strong>Endpoint:</strong>
                            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded ml-2">
                              {lastRequest.endpoint}
                            </code>
                          </div>
                          <div>
                            <strong>Request Body:</strong>
                            <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded mt-2 overflow-auto max-h-60 text-xs">
                              {formatJSON(lastRequest.fullRequest)}
                            </pre>
                          </div>
                          <div>
                            <strong>Content-Type:</strong> application/json
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Text Preprocessing */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm arabic-text">
                          🔄 معالجة النص
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs">
                        <div className="space-y-2">
                          <div>
                            <strong>النص الأصلي:</strong>
                            <p className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded mt-1">
                              "{lastRequest.text}"
                            </p>
                          </div>
                          <div>
                            <strong>السياق المرفق:</strong>
                            <p className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded mt-1">
                              "{lastRequest.context || "لا يوجد سياق"}"
                            </p>
                          </div>
                          {lastRequest.preprocessedText && (
                            <div>
                              <strong>النص المعالج:</strong>
                              <p className="bg-green-50 dark:bg-green-900/20 p-2 rounded mt-1">
                                "{lastRequest.preprocessedText}"
                              </p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="response" className="space-y-4">
                {lastResponse && (
                  <div className="space-y-4">
                    {/* Response Status */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm arabic-text flex items-center gap-2">
                          {lastResponse.error ? (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          حالة الاستجابة
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-xs">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <strong>HTTP Status:</strong>
                            <Badge
                              className={getStatusColor(lastResponse.status)}
                            >
                              {lastResponse.status}
                            </Badge>
                          </div>
                          <div>
                            <strong>Response Time:</strong>{" "}
                            {lastResponse.processingTime || "غير محدد"}ms
                          </div>
                          <div>
                            <strong>Timestamp:</strong>{" "}
                            {new Date(lastResponse.timestamp).toLocaleString(
                              "ar-SA",
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Parsed Response */}
                    {lastResponse.result && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm arabic-text flex items-center justify-between">
                            🧠 الاستجابة المحللة
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copyToClipboard(
                                  formatJSON(lastResponse.result),
                                  "الاستجابة المحللة",
                                )
                              }
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <div>
                                <strong>isCommand:</strong>{" "}
                                {lastResponse.result.isCommand
                                  ? "true"
                                  : "false"}
                              </div>
                              <div>
                                <strong>commandType:</strong>{" "}
                                {lastResponse.result.commandType || "null"}
                              </div>
                              <div>
                                <strong>action:</strong>{" "}
                                {lastResponse.result.action}
                              </div>
                              <div>
                                <strong>confidence:</strong>{" "}
                                {Math.round(
                                  (lastResponse.result.confidence || 0) * 100,
                                )}
                                %
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div>
                                <strong>target:</strong>{" "}
                                {lastResponse.result.target || "غير محدد"}
                              </div>
                              <div>
                                <strong>content:</strong>{" "}
                                {lastResponse.result.content || "غير محدد"}
                              </div>
                              <div>
                                <strong>position:</strong>{" "}
                                {lastResponse.result.position || "غير محدد"}
                              </div>
                              <div>
                                <strong>provider:</strong>{" "}
                                {lastResponse.result.provider}
                              </div>
                            </div>
                          </div>

                          {lastResponse.result.thinking && (
                            <div className="mt-4">
                              <strong>عملية التفكير:</strong>
                              <p className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded mt-2">
                                {lastResponse.result.thinking}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {/* Error Details */}
                    {lastResponse.error && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm arabic-text text-red-600">
                            ❌ تفاصيل الخطأ
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs">
                          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                            <p className="text-red-800 dark:text-red-200">
                              {lastResponse.error}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="timeline" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm arabic-text flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      الخط الزمني للمعالجة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {getProcessingSteps().map((step, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              step.status === "completed"
                                ? "bg-green-100 text-green-700"
                                : step.status === "error"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {step.step}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium text-sm">
                                {step.name}
                              </h4>
                              <Badge
                                variant={
                                  step.status === "error"
                                    ? "destructive"
                                    : "default"
                                }
                                className="text-xs"
                              >
                                {step.status === "completed"
                                  ? "مكتمل"
                                  : step.status === "error"
                                    ? "خطأ"
                                    : "معلق"}
                              </Badge>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {step.details}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(step.timestamp).toLocaleString("ar-SA")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="raw" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Raw Request */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm arabic-text flex items-center justify-between">
                        📤 البيانات الخام للطلب
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            lastRequest &&
                            copyToClipboard(
                              formatJSON(lastRequest),
                              "البيانات الخام للطلب",
                            )
                          }
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto max-h-96">
                        {lastRequest
                          ? formatJSON(lastRequest)
                          : "لا توجد بيانات"}
                      </pre>
                    </CardContent>
                  </Card>

                  {/* Raw Response */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm arabic-text flex items-center justify-between">
                        📥 البيانات الخام للاستجابة
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            lastResponse &&
                            copyToClipboard(
                              formatJSON(lastResponse),
                              "البيانات الخام للاستجابة",
                            )
                          }
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto max-h-96">
                        {lastResponse
                          ? formatJSON(lastResponse)
                          : "لا توجد بيانات"}
                      </pre>
                    </CardContent>
                  </Card>
                </div>

                {/* System Prompt */}
                {lastRequest?.systemPrompt && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm arabic-text flex items-center justify-between">
                        🤖 System Prompt المرسل
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(
                              lastRequest.systemPrompt || "",
                              "System Prompt",
                            )
                          }
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-auto max-h-60">
                        {lastRequest.systemPrompt}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      )}
    </Card>
  );
}

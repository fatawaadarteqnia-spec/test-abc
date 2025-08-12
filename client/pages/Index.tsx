import { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Square,
  Play,
  FileText,
  Volume2,
  Settings,
  Download,
  Brain,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  CommandAnalysisRequest,
  CommandAnalysisResponse,
  AIError,
} from "@shared/ai-commands";
import { MultiAIConfigDialog } from "@/components/MultiAIConfigDialog";
import { DetailedRequestAnalyzer } from "@/components/DetailedRequestAnalyzer";

type VoiceStatus = "inactive" | "listening" | "processing" | "active";

interface Command {
  type: "insert" | "delete" | "replace" | "format";
  content?: string;
  target?: string;
  replacement?: string;
}

export default function Index() {
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("inactive");
  const [transcript, setTranscript] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [lastCommand, setLastCommand] = useState<string>("");
  const [lastAnalysis, setLastAnalysis] =
    useState<CommandAnalysisResponse | null>(null);
  const [isContinuousMode, setIsContinuousMode] = useState(false);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [aiStatus, setAiStatus] = useState<
    "ready" | "processing" | "error" | "unavailable"
  >("ready");
  const [aiProviders, setAiProviders] = useState<string[]>([]);
  const [providerStatus, setProviderStatus] = useState<any>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("auto");
  const [testCommand, setTestCommand] = useState<string>("");
  const [showRequestDetails, setShowRequestDetails] = useState<boolean>(false);
  const [showAdvancedAnalyzer, setShowAdvancedAnalyzer] =
    useState<boolean>(false);
  const [lastRequest, setLastRequest] = useState<any>(null);
  const [lastResponse, setLastResponse] = useState<any>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { toast } = useToast();

  // Helper function to escape regex special characters
  const escapeRegExp = (string: string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  };

  // Check AI status with robust fallback - offline-first approach
  useEffect(() => {
    const initializeApp = () => {
      try {
        console.log("Initializing app in offline-first mode...");

        // Set default offline state immediately
        setAiStatus("unavailable");
        setAiProviders([]);
        setProviderStatus({
          providers: [
            {
              name: "deepseek",
              displayName: "DeepSeek",
              available: false,
              priority: 1,
              configured: false,
              working: false,
              error: "غير مكوّن",
              lastTested: null,
            },
            {
              name: "gemini",
              displayName: "Google Gemini",
              available: false,
              priority: 2,
              configured: false,
              working: false,
              error: "غير مك��ّن",
              lastTested: null,
            },
            {
              name: "openai",
              displayName: "OpenAI GPT",
              available: false,
              priority: 3,
              configured: false,
              working: false,
              error: "غير مكوّن",
              lastTested: null,
            },
            {
              name: "groq",
              displayName: "Groq",
              available: false,
              priority: 4,
              configured: false,
              working: false,
              error: "غير مكوّن",
              lastTested: null,
            },
            {
              name: "claude",
              displayName: "Claude",
              available: false,
              priority: 5,
              configured: false,
              working: false,
              error: "غير مكوّن",
              lastTested: null,
            },
          ],
          totalAvailable: 0,
          totalWorking: 0,
          timestamp: new Date().toISOString(),
        });

        console.log(
          "App initialized in offline mode, will try to connect to server...",
        );

        // Then try to upgrade to online mode
        setTimeout(() => tryConnectToServer(), 1000);
      } catch (error) {
        console.error("Failed to initialize app:", error);
        // App still works in offline mode
      }
    };

    const tryConnectToServer = async () => {
      try {
        console.log("Attempting to connect to server...");

        // Simple ping with very short timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch("/api/ping", {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const data = await response.json();
          console.log("Server connection successful:", data);

          setAiProviders(data.providers || []);

          if (data.providers && data.providers.length > 0) {
            setAiStatus("ready");
          } else {
            setAiStatus("unavailable");
          }

          // Try to get detailed status
          tryGetDetailedStatus();
        } else {
          console.log("Server responded but with error:", response.status);
          // Keep offline mode
        }
      } catch (error: any) {
        console.log(
          "Server connection failed, staying in offline mode:",
          error.message,
        );
        // Stay in offline mode - no error shown to user
      }
    };

    const tryGetDetailedStatus = async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch("/api/ai-status", {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const statusData = await response.json();
          console.log("Detailed status received:", statusData);
          setProviderStatus(statusData);

          if (statusData.totalWorking > 0) {
            setAiStatus("ready");
          } else if (statusData.totalAvailable > 0) {
            setAiStatus("error");
          } else {
            setAiStatus("unavailable");
          }
        }
      } catch (error) {
        console.log("Detailed status failed, keeping basic status");
        // Keep basic status
      }
    };

    // Initialize immediately
    initializeApp();
  }, []);

  // Manual refresh function
  const refreshAIStatus = async () => {
    console.log("Manual refresh triggered");
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch("/api/ai-status", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const statusData = await response.json();
        console.log("Manual refresh successful:", statusData);
        setProviderStatus(statusData);

        if (statusData.totalWorking > 0) {
          setAiStatus("ready");
        } else if (statusData.totalAvailable > 0) {
          setAiStatus("error");
        } else {
          setAiStatus("unavailable");
        }

        toast({
          title: "تم التحديث",
          description: "تم تحديث حالة مقدمي الخدمات",
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.log("Manual refresh failed:", error);
      toast({
        title: "فشل التحديث",
        description:
          "لم يتمكن من تحديث ��لحالة - ال��طبيق يعمل في الوضع الأساسي",
        variant: "destructive",
      });
    }
  };

  // Execute test command (typed text instead of voice)
  const executeTestCommand = async () => {
    if (!testCommand.trim()) return;

    console.log("Executing test command:", testCommand);

    // Use the same logic as voice processing
    await processVoiceInput(testCommand.trim());

    // Clear the test command after execution
    setTestCommand("");
  };

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();

      const recognition = recognitionRef.current;
      recognition.lang = "ar-SA";
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setVoiceStatus("listening");
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        setVoiceStatus("processing");
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(finalTranscript);
          processVoiceInput(finalTranscript);
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setVoiceStatus("inactive");
        setIsListening(false);
        toast({
          title: "خطأ في التعرف على الصوت",
          description:
            "حدث خطأ أثناء التعرف على الصوت. يرجى المحاولة مرة أخرى.",
          variant: "destructive",
        });
      };

      recognition.onend = () => {
        setVoiceStatus("inactive");
        setIsListening(false);
        if (isContinuousMode) {
          // Restart recognition in continuous mode
          setTimeout(() => startListening(), 100);
        }
      };
    } else {
      toast({
        title: "ال��تصفح غير مدعوم",
        description:
          "متصفحك لا يدعم التعر�� على الصوت. يرجى استخدام Chrome أو Edge.",
        variant: "destructive",
      });
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isContinuousMode]);

  const processVoiceInput = async (input: string) => {
    const cleanInput = input.trim();
    setLastCommand(cleanInput);
    setCommandHistory((prev) => [cleanInput, ...prev.slice(0, 9)]);

    // Quick check for stop command (bypass AI for immediate response)
    if (cleanInput.includes("ت��قف") || cleanInput.includes("إيقاف")) {
      stopListening();
      setIsContinuousMode(false);
      toast({
        title: "تم الإيقاف",
        description: "تم إيقاف التسجيل الصوتي.",
      });
      return;
    }

    // Quick check for continuous mode activation
    if (cleanInput.includes("استمرار") || cleanInput.includes("وضع مستمر")) {
      setIsContinuousMode(true);
      toast({
        title: "الوضع المستمر",
        description: "تم تفعيل الوضع المستمر. قل 'توقف' للإيقاف.",
      });
      return;
    }

    // Use AI to analyze the command
    try {
      setAiStatus("processing");
      const analysis = await analyzeWithAI(cleanInput);
      setLastAnalysis(analysis);

      // Show thinking process if available
      if (analysis.thinking) {
        console.log("AI Thinking:", analysis.thinking);
      }

      if (analysis.isCommand) {
        await executeAICommand(analysis, cleanInput);
      } else {
        insertText(analysis.content || cleanInput);
      }

      setAiStatus("ready");

      // Show which provider was used and thinking if available
      const providerInfo = analysis.provider ? ` (${analysis.provider})` : "";
      const thinkingInfo = analysis.thinking
        ? `\n\nالتفكير: ${analysis.thinking}`
        : "";

      toast({
        title: analysis.isCommand ? "تم تنفيذ الأمر" : "تم إدراج النص",
        description: `${analysis.explanation}${providerInfo}${thinkingInfo}`,
      });
    } catch (error) {
      console.error("AI analysis failed:", error);
      setAiStatus("error");

      // Fallback to basic detection
      const command = detectCommand(cleanInput);
      if (command) {
        executeCommand(command, cleanInput);
      } else {
        insertText(cleanInput);
      }

      toast({
        title: "تم استخدام التحليل الأساسي",
        description: "فشل الذكاء الاصطناعي، تم استخدام التح��يل الأساسي",
        variant: "destructive",
      });
    }

    setVoiceStatus("active");
    setTimeout(() => setVoiceStatus("inactive"), 1000);
  };

  const analyzeWithAI = async (
    text: string,
  ): Promise<CommandAnalysisResponse> => {
    const requestData: CommandAnalysisRequest = {
      text,
      context: documentContent.slice(-200), // Last 200 characters for context
    };

    // Save detailed request for analysis
    const requestDetails = {
      timestamp: new Date().toISOString(),
      text: text,
      context: documentContent.slice(-200),
      selectedProvider: selectedProvider,
      endpoint:
        selectedProvider === "auto"
          ? "/api/analyze-command"
          : `/api/analyze-with/${selectedProvider}`,
      fullRequest: requestData,
      processingSteps: [
        "تحليل النص المدخل",
        "استخراج السياق",
        "اختيار مقدم الخدمة",
        "تحضير الطلب",
        "إرسال للذكاء الاصطناعي",
      ],
      preprocessedText: text, // Could be enhanced with actual preprocessing
      systemPrompt: "سيتم جلبه من الخادم", // This would need to be fetched
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": navigator.userAgent,
        Timestamp: new Date().toISOString(),
      },
    };
    setLastRequest(requestDetails);

    console.log("🚀 طلب جديد للذكاء الاصطناعي:", requestDetails);

    // Choose endpoint based on selected provider
    const endpoint =
      selectedProvider === "auto"
        ? "/api/analyze-command"
        : `/api/analyze-with/${selectedProvider}`;

    // Add timeout to AI requests
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    // Record start time for performance measurement
    const startTime = performance.now();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestData),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        let errorMessage = "فشل في تحليل الأمر";
        try {
          const errorData: AIError = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (parseError) {
          console.warn("Failed to parse error response");
        }

        // Save error response
        const errorResponse = {
          timestamp: new Date().toISOString(),
          status: response.status,
          error: errorMessage,
          request: requestDetails,
        };
        setLastResponse(errorResponse);
        console.log("❌ خطأ في الاستجابة:", errorResponse);

        throw new Error(errorMessage);
      }

      const result = await response.json();
      const endTime = performance.now();
      const processingTime = Math.round(endTime - startTime);

      // Save detailed response
      const responseDetails = {
        timestamp: new Date().toISOString(),
        status: response.status,
        result: result,
        request: requestDetails,
        processingTime: processingTime,
        headers: Object.fromEntries(response.headers.entries()),
        rawResponse: JSON.stringify(result, null, 2),
      };
      setLastResponse(responseDetails);
      console.log("✅ استجابة ناجحة:", responseDetails);

      return result;
    } catch (error) {
      clearTimeout(timeout);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          throw new Error("انتهت مهلة الانتظار - يرجى المحاولة مر�� أخرى");
        }
        throw error;
      }
      throw new Error("خطأ غير متوقع في التحلي��");
    }
  };

  const executeAICommand = async (
    analysis: CommandAnalysisResponse,
    originalText: string,
  ) => {
    console.log("Executing AI command:", analysis);
    console.log("Original command text:", originalText);

    switch (analysis.commandType) {
      case "delete":
        if (analysis.target === "all") {
          if (window.confirm("هل أنت متأكد من حذف جميع المحتوى؟")) {
            setDocumentContent("");
          }
        } else if (analysis.target === "last") {
          const lines = documentContent.split("\n");
          if (lines.length > 0) {
            lines.pop();
            setDocumentContent(lines.join("\n"));
          }
        } else if (analysis.target) {
          // Delete specific text
          const newContent = documentContent.replace(analysis.target, "");
          setDocumentContent(newContent);
        }
        break;

      case "format":
        if (analysis.content) {
          setDocumentContent(
            (prev) => prev + (prev ? "\n\n" : "") + `# ${analysis.content}\n`,
          );
        }
        break;

      case "insert":
        if (!analysis.content) break;

        // Handle different positions
        switch (analysis.position) {
          case "start":
            setDocumentContent(
              (prev) => analysis.content + (prev ? "\n" + prev : ""),
            );
            break;

          case "end":
            setDocumentContent(
              (prev) => prev + (prev ? "\n" : "") + analysis.content,
            );
            break;

          case "after":
            if (
              analysis.target &&
              analysis.target !== "start" &&
              analysis.target !== "end"
            ) {
              console.log(
                "Looking for target:",
                analysis.target,
                "in document:",
                documentContent,
              );

              // Smart target detection - handle complex insertion commands
              let targetFound = false;
              let newContent = documentContent;

              // First try exact match
              const targetIndex = documentContent.indexOf(analysis.target);
              if (targetIndex !== -1) {
                const insertIndex = targetIndex + analysis.target.length;
                const charAfterTarget = documentContent.charAt(insertIndex);
                const needsSpace =
                  charAfterTarget !== "" &&
                  charAfterTarget !== " " &&
                  charAfterTarget !== "\n";
                const spaceAfter = needsSpace ? " " : "";

                newContent =
                  documentContent.slice(0, insertIndex) +
                  " " +
                  analysis.content +
                  spaceAfter +
                  documentContent.slice(insertIndex);
                targetFound = true;
                console.log("Exact target found at:", targetIndex);
              } else {
                // Advanced: Check if this is a "between X and Y" command
                // Look for patterns in original command or explanation
                const betweenPatterns = [
                  /بين\s+كلمة\s+(.+?)\s+وكلمة\s+(.+?)\s+(?:اكتب|أضف|ضع)\s+(?:كلمة\s+)?(.+?)(?:\s|$|\.)/,
                  /بين\s+كلمة\s+(.+?)\s+و\s*كلمة\s+(.+?)\s+(.+?)(?:\s|$|\.)/,
                  /بين\s+(.+?)\s+وكلمة\s+(.+?)\s+(?:اكتب|أضف|ضع)\s+(?:كلمة\s+)?(.+?)(?:\s|$|\.)/,
                  /بين\s+(.+?)\s+و\s*(.+?)\s+(?:اكتب|أضف|ضع)\s+(.+?)(?:\s|$|\.)/,
                  /بين\s+(.+?)\s+و\s*(.+?)(?:\s|$)/,
                ];

                let betweenMatch = null;
                for (const pattern of betweenPatterns) {
                  betweenMatch =
                    analysis.explanation?.match(pattern) ||
                    originalText?.match(pattern);
                  if (betweenMatch) break;
                }

                if (betweenMatch) {
                  let word1, word2, contentToAdd;

                  if (betweenMatch.length >= 4) {
                    // Full pattern with content extraction
                    word1 = betweenMatch[1].trim();
                    word2 = betweenMatch[2].trim();
                    contentToAdd = betweenMatch[3].trim();
                  } else {
                    // Simple pattern, use analysis content
                    word1 = betweenMatch[1].replace(/كلمة\s+/, "").trim();
                    word2 = betweenMatch[2].replace(/كلمة\s+/, "").trim();
                    contentToAdd = analysis.content;
                  }

                  // Clean content - remove "كلمة" prefix if exists
                  contentToAdd = contentToAdd?.replace(/^كلمة\s+/, "").trim();

                  console.log('🎯 كشف أمر "بين":', {
                    word1,
                    word2,
                    contentToAdd,
                  });

                  const word1Index = documentContent.indexOf(word1);
                  const word2Index = documentContent.indexOf(word2);

                  if (word1Index !== -1 && word2Index !== -1) {
                    // Find the logical position between the words
                    let insertPos;

                    if (word1Index < word2Index) {
                      // word1 comes first in text, insert after word1
                      insertPos = word1Index + word1.length;
                      console.log(
                        `📍 ${word1} يأتي قبل ${word2} - الإدراج بعد ${word1}`,
                      );
                    } else {
                      // word2 comes first in text, insert after word2
                      insertPos = word2Index + word2.length;
                      console.log(
                        `📍 ${word2} يأتي قبل ${word1} - الإدراج بعد ${word2}`,
                      );
                    }

                    const charAtInsert = documentContent.charAt(insertPos);
                    const needsSpace =
                      charAtInsert !== "" &&
                      charAtInsert !== " " &&
                      charAtInsert !== "\n";
                    const spaceAfter = needsSpace ? " " : "";

                    newContent =
                      documentContent.slice(0, insertPos) +
                      " " +
                      contentToAdd +
                      spaceAfter +
                      documentContent.slice(insertPos);
                    targetFound = true;

                    console.log(
                      "✅ نجح الإدراج بين الكلمات في الموضع:",
                      insertPos,
                    );
                    console.log("📄 النتيجة:", newContent);
                  } else {
                    console.log("❌ لم توجد إحدى الكلمتين:", {
                      word1,
                      word1Found: word1Index !== -1,
                      word2,
                      word2Found: word2Index !== -1,
                    });
                  }
                }

                // If still not found, try partial word matching
                if (!targetFound) {
                  const words = analysis.target.split(" ");
                  for (const word of words) {
                    if (word.length > 2) {
                      const wordIndex = documentContent.indexOf(word);
                      if (wordIndex !== -1) {
                        const insertIndex = wordIndex + word.length;
                        const charAfterTarget =
                          documentContent.charAt(insertIndex);
                        const needsSpace =
                          charAfterTarget !== "" &&
                          charAfterTarget !== " " &&
                          charAfterTarget !== "\n";
                        const spaceAfter = needsSpace ? " " : "";

                        newContent =
                          documentContent.slice(0, insertIndex) +
                          " " +
                          analysis.content +
                          spaceAfter +
                          documentContent.slice(insertIndex);
                        targetFound = true;
                        console.log(
                          "Partial match found for word:",
                          word,
                          "at:",
                          wordIndex,
                        );
                        break;
                      }
                    }
                  }
                }
              }

              if (targetFound) {
                setDocumentContent(newContent);
                console.log("Content updated successfully:", newContent);
              } else {
                console.log(
                  "Target not found:",
                  analysis.target,
                  "Adding at end instead",
                );
                toast({
                  title: "⚠️ لم أجد الهدف",
                  description: `لم أجد "${analysis.target}" في النص. تم الإضافة في النهاية بدلاً من ذلك.`,
                  variant: "destructive",
                });
                insertText(analysis.content);
              }
            } else {
              insertText(analysis.content);
            }
            break;

          case "before":
            if (
              analysis.target &&
              analysis.target !== "start" &&
              analysis.target !== "end"
            ) {
              console.log(
                "Looking for target (before):",
                analysis.target,
                "in document:",
                documentContent,
              );

              let targetFound = false;
              let newContent = documentContent;

              // First try exact match
              const targetIndex = documentContent.indexOf(analysis.target);
              if (targetIndex !== -1) {
                const charBeforeTarget =
                  targetIndex > 0
                    ? documentContent.charAt(targetIndex - 1)
                    : "";
                const needsSpaceBefore =
                  charBeforeTarget !== "" &&
                  charBeforeTarget !== " " &&
                  charBeforeTarget !== "\n";
                const spaceBefore = needsSpaceBefore ? " " : "";

                newContent =
                  documentContent.slice(0, targetIndex) +
                  spaceBefore +
                  analysis.content +
                  " " +
                  documentContent.slice(targetIndex);
                targetFound = true;
                console.log("Exact target found (before) at:", targetIndex);
              } else {
                // Try partial word matching for "before" commands
                const words = analysis.target.split(" ");
                for (const word of words) {
                  if (word.length > 2) {
                    const wordIndex = documentContent.indexOf(word);
                    if (wordIndex !== -1) {
                      const charBeforeTarget =
                        wordIndex > 0
                          ? documentContent.charAt(wordIndex - 1)
                          : "";
                      const needsSpaceBefore =
                        charBeforeTarget !== "" &&
                        charBeforeTarget !== " " &&
                        charBeforeTarget !== "\n";
                      const spaceBefore = needsSpaceBefore ? " " : "";

                      newContent =
                        documentContent.slice(0, wordIndex) +
                        spaceBefore +
                        analysis.content +
                        " " +
                        documentContent.slice(wordIndex);
                      targetFound = true;
                      console.log(
                        "Partial match found (before) for word:",
                        word,
                        "at:",
                        wordIndex,
                      );
                      break;
                    }
                  }
                }
              }

              if (targetFound) {
                setDocumentContent(newContent);
                console.log(
                  "Content updated successfully (before):",
                  newContent,
                );
              } else {
                console.log(
                  "Target not found (before):",
                  analysis.target,
                  "Adding at end instead",
                );
                toast({
                  title: "⚠️ لم أجد الهدف",
                  description: `لم أجد "${analysis.target}" في النص. تم الإضافة في النهاية بدلاً من ذلك.`,
                  variant: "destructive",
                });
                insertText(analysis.content);
              }
            } else {
              insertText(analysis.content);
            }
            break;

          default:
            // Default insert at end
            insertText(analysis.content);
        }
        break;

      case "replace":
        if (analysis.target && (analysis.replacement || analysis.content)) {
          const replacement = analysis.replacement || analysis.content || "";
          console.log("Replacing:", analysis.target, "with:", replacement);

          // Use replaceAll to replace all occurrences, or just first occurrence
          const newContent = documentContent.replace(
            new RegExp(escapeRegExp(analysis.target), "g"),
            replacement,
          );
          setDocumentContent(newContent);

          console.log("Replace completed. New content:", newContent);
        }
        break;

      case "control":
        if (
          analysis.action.includes("إيقاف") ||
          analysis.action.includes("توقف")
        ) {
          stopListening();
          setIsContinuousMode(false);
        } else if (
          analysis.action.includes("مستمر") ||
          analysis.action.includes("استمرار")
        ) {
          setIsContinuousMode(true);
        }
        break;

      default:
        insertText(analysis.content || originalText);
    }
  };

  const detectCommand = (input: string): Command | null => {
    const text = input.toLowerCase();

    // Delete commands
    if (
      text.includes("امسح") ||
      text.includes("احذف") ||
      text.includes("إزالة")
    ) {
      if (text.includes("آخر") || text.includes("أخير")) {
        return { type: "delete", target: "last" };
      }
      if (text.includes("كل") || text.includes("جميع")) {
        return { type: "delete", target: "all" };
      }
      return { type: "delete", target: "selection" };
    }

    // Replace commands
    if (text.includes("استبدل") || text.includes("غير")) {
      return { type: "replace" };
    }

    // Format commands
    if (text.includes("عنوان") || text.includes("رأس")) {
      return { type: "format", content: "heading" };
    }

    // Add commands
    if (text.includes("أضف") || text.includes("اكت��")) {
      return { type: "insert" };
    }

    return null;
  };

  const executeCommand = (command: Command, originalText: string) => {
    switch (command.type) {
      case "delete":
        if (command.target === "all") {
          if (window.confirm("هل أنت متأك�� من حذف جميع المحتوى؟")) {
            setDocumentContent("");
            toast({
              title: "تم حذف المحتوى",
              description: "تم حذف جميع المحتوى.",
            });
          }
        } else if (command.target === "last") {
          const lines = documentContent.split("\n");
          if (lines.length > 0) {
            lines.pop();
            setDocumentContent(lines.join("\n"));
            toast({ title: "تم الحذف", description: "تم حذف آخر سطر." });
          }
        }
        break;

      case "format":
        if (command.content === "heading") {
          const textToAdd = originalText.replace(/.*عنوا��/i, "").trim();
          if (textToAdd) {
            setDocumentContent(
              (prev) => prev + (prev ? "\n\n" : "") + `# ${textToAdd}\n`,
            );
            toast({
              title: "تم إضافة العنوان",
              description: `تم إضافة العنوان: ${textToAdd}`,
            });
          }
        }
        break;

      case "insert":
        const textToInsert = originalText.replace(/^(أضف|اكتب)\s*/i, "").trim();
        if (textToInsert) {
          insertText(textToInsert);
        }
        break;

      default:
        insertText(originalText);
    }
  };

  const insertText = (text: string) => {
    setDocumentContent((prev) => {
      const newContent =
        prev + (prev && !prev.endsWith("\n") ? " " : "") + text;
      return newContent;
    });

    toast({
      title: "ت�� إدراج النص",
      description: `تم إدراج: ${text.substring(0, 30)}${text.length > 30 ? "..." : ""}`,
    });
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const downloadDocument = () => {
    if (!documentContent.trim()) {
      toast({
        title: "لا يوجد محتوى",
        description: "لا يوجد محتوى لتنزيله.",
        variant: "destructive",
      });
      return;
    }

    const blob = new Blob([documentContent], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `مستند-${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "تم التنزيل",
      description: "تم تنزيل المستند بنجاح.",
    });
  };

  const getStatusText = (status: VoiceStatus) => {
    switch (status) {
      case "listening":
        return "أستمع...";
      case "processing":
        return "أعالج...";
      case "active":
        return "تم التنفيذ";
      default:
        return "غير نشط";
    }
  };

  const getStatusColor = (status: VoiceStatus) => {
    switch (status) {
      case "listening":
        return "voice-listening";
      case "processing":
        return "voice-processing";
      case "active":
        return "voice-active";
      default:
        return "voice-inactive";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white arabic-text">
              مساعد الوثائق الصوتي بالذكاء الاصطناعي
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-300 arabic-text">
            اكتب وحرر ال��ثائق باستخدام صوتك ��اللغة العربية مع تحليل ذكي
            للأوامر
          </p>

          {/* AI Status Indicator */}
          <div className="flex flex-col items-center gap-3 mt-4">
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  aiStatus === "ready"
                    ? "default"
                    : aiStatus === "processing"
                      ? "secondary"
                      : "destructive"
                }
                className="arabic-text"
              >
                {aiStatus === "ready" && (
                  <>
                    <Zap className="w-3 h-3 ml-1" />
                    {aiProviders.length > 0
                      ? `🤖 متاح ${aiProviders.length} مقدم خدمة`
                      : "الذكاء الاصطناعي جاهز"}
                  </>
                )}
                {aiStatus === "processing" && (
                  <>
                    <Brain className="w-3 h-3 ml-1 animate-pulse" />
                    يحلل الأمر...
                  </>
                )}
                {aiStatus === "error" && <>⚠️ خطأ في الذكاء الاصطناعي</>}
                {aiStatus === "unavailable" && (
                  <>��� الذكاء الاصطناعي ��ير متاح</>
                )}
              </Badge>

              {/* Request/Response Debug Panel */}
              <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold arabic-text flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    🔍 تفاصيل التحليل
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRequestDetails(!showRequestDetails)}
                    className="arabic-text text-xs"
                  >
                    {showRequestDetails ? "إخفاء" : "عرض"}
                  </Button>
                </div>

                {showRequestDetails && (
                  <div className="space-y-3">
                    {/* Last Request */}
                    {lastRequest && (
                      <div className="border rounded p-2 bg-blue-50 dark:bg-blue-900/20 text-xs">
                        <h5 className="font-medium mb-1 arabic-text text-blue-700 dark:text-blue-300">
                          📤 الطلب المرسل:
                        </h5>
                        <div className="space-y-1">
                          <p>
                            <strong>النص:</strong> "{lastRequest.text}"
                          </p>
                          <p>
                            <strong>السياق:</strong> "
                            {lastRequest.context || "لا يوجد"}"
                          </p>
                          <p>
                            <strong>المقدم:</strong>{" "}
                            {lastRequest.selectedProvider}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Last Response */}
                    {lastResponse && (
                      <div
                        className={`border rounded p-2 text-xs ${
                          lastResponse.error
                            ? "bg-red-50 dark:bg-red-900/20"
                            : "bg-green-50 dark:bg-green-900/20"
                        }`}
                      >
                        <h5
                          className={`font-medium mb-1 arabic-text ${
                            lastResponse.error
                              ? "text-red-700 dark:text-red-300"
                              : "text-green-700 dark:text-green-300"
                          }`}
                        >
                          {lastResponse.error ? "❌ خطأ:" : "✅ الاستجابة:"}
                        </h5>
                        <div className="space-y-1">
                          {lastResponse.error ? (
                            <p>{lastResponse.error}</p>
                          ) : (
                            lastResponse.result && (
                              <>
                                <p>
                                  <strong>نوع:</strong>{" "}
                                  {lastResponse.result.commandType || "نص عادي"}
                                </p>
                                <p>
                                  <strong>هدف:</strong>{" "}
                                  {lastResponse.result.target || "غير محدد"}
                                </p>
                                <p>
                                  <strong>محتوى:</strong>{" "}
                                  {lastResponse.result.content || "غير محدد"}
                                </p>
                                <p>
                                  <strong>ثقة:</strong>{" "}
                                  {Math.round(
                                    (lastResponse.result.confidence || 0) * 100,
                                  )}
                                  %
                                </p>
                                <p>
                                  <strong>مقدم:</strong>{" "}
                                  {lastResponse.result.provider}
                                </p>
                              </>
                            )
                          )}
                        </div>
                      </div>
                    )}

                    {!lastRequest && !lastResponse && (
                      <p className="text-center text-gray-500 arabic-text text-xs">
                        قل أو اكتب شيئاً لرؤية التفاصيل
                      </p>
                    )}
                  </div>
                )}
              </div>

              <MultiAIConfigDialog
                aiStatus={providerStatus}
                selectedProvider={selectedProvider}
                onProviderSelect={setSelectedProvider}
                onConfigUpdate={() => {
                  // Refresh status after config update
                  console.log("Config updated, refreshing status...");
                  refreshAIStatus();
                }}
              />
            </div>

            {/* Show available providers and selection */}
            {aiProviders.length > 0 && (
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex flex-wrap gap-1">
                  {aiProviders.map((provider, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {provider}
                    </Badge>
                  ))}
                </div>

                {selectedProvider !== "auto" && (
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="text-xs arabic-text">
                      الخدمة المحددة: {selectedProvider}
                    </Badge>
                    <Button
                      onClick={() => setSelectedProvider("auto")}
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-xs arabic-text"
                    >
                      تلقائي
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Voice Control Panel */}
          <div className="lg:col-span-1">
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 arabic-text">
                  <Volume2 className="w-5 h-5" />
                  التحكم الصوتي
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Voice Status */}
                <div className="text-center">
                  <div
                    className={`w-24 h-24 mx-auto rounded-full border-4 border-${getStatusColor(voiceStatus)} flex items-center justify-center mb-4 transition-all duration-300 ${voiceStatus !== "inactive" ? "pulse-voice" : ""}`}
                  >
                    {isListening ? (
                      <Mic className="w-8 h-8 text-blue-600" />
                    ) : (
                      <MicOff className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <Badge
                    variant={
                      voiceStatus === "inactive" ? "secondary" : "default"
                    }
                    className="text-sm arabic-text"
                  >
                    {getStatusText(voiceStatus)}
                  </Badge>
                </div>

                {/* Control Buttons */}
                <div className="flex flex-col gap-3">
                  <Button
                    onClick={toggleListening}
                    className={`w-full h-12 text-base arabic-text ${
                      isListening
                        ? "bg-red-500 hover:bg-red-600"
                        : "bg-blue-500 hover:bg-blue-600"
                    }`}
                  >
                    {isListening ? (
                      <>
                        <Square className="w-5 h-5 ml-2" />
                        إيقاف التسجيل
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 ml-2" />
                        بدء التسجيل
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setIsContinuousMode(!isContinuousMode)}
                    variant={isContinuousMode ? "default" : "outline"}
                    className="w-full arabic-text"
                  >
                    الوضع المستمر {isContinuousMode ? "(مفعل)" : "(معطل)"}
                  </Button>
                </div>

                {/* Last Command */}
                {lastCommand && (
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                      آخر أمر:
                    </p>
                    <p className="text-sm font-medium arabic-text">
                      {lastCommand}
                    </p>
                  </div>
                )}

                {/* AI Analysis */}
                {lastAnalysis && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="w-4 h-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 arabic-text">
                        تحليل الذكاء الاصطناعي
                      </p>
                      <Badge
                        variant={
                          lastAnalysis.isCommand ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {lastAnalysis.isCommand ? "أمر" : "نص"}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300 arabic-text">
                      <p>
                        <strong>العمل:</strong> {lastAnalysis.action}
                      </p>
                      <p>
                        <strong>��لثقة:</strong>{" "}
                        {Math.round(lastAnalysis.confidence * 100)}%
                      </p>
                      <p>
                        <strong>التفسير:</strong> {lastAnalysis.explanation}
                      </p>
                    </div>
                  </div>
                )}

                {/* Command History */}
                {commandHistory.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 arabic-text">
                      سجل الأوامر
                    </h4>
                    <div className="max-h-32 overflow-y-auto arabic-scroll space-y-1">
                      {commandHistory.slice(0, 5).map((cmd, idx) => (
                        <div
                          key={idx}
                          className="text-xs p-2 bg-gray-50 dark:bg-gray-800 rounded text-gray-600 dark:text-gray-400 arabic-text"
                        >
                          {cmd}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Text Command Testing */}
                <div className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 arabic-text flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      اختبار الأ��امر النصية
                    </h4>
                    <div className="flex items-center gap-1">
                      <div
                        className={`w-2 h-2 rounded-full ${aiStatus === "ready" ? "bg-green-500" : "bg-gray-400"}`}
                      ></div>
                      <span className="text-xs text-gray-500 arabic-text">
                        {aiStatus === "ready" ? "AI جاهز" : "AI غير متاح"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <Textarea
                        value={testCommand}
                        onChange={(e) => setTestCommand(e.target.value)}
                        placeholder="اكتب أمرك هنا... مثل: اكتب بعد كلمة الحمد كلمة لله"
                        className="min-h-[60px] arabic-text"
                        dir="rtl"
                        maxLength={200}
                      />
                      <div className="absolute bottom-2 left-2 text-xs text-gray-400">
                        {testCommand.length}/200
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={executeTestCommand}
                        disabled={
                          !testCommand.trim() || aiStatus === "processing"
                        }
                        className="flex-1 arabic-text"
                        size="sm"
                      >
                        {aiStatus === "processing" ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin ml-1" />
                            يحلل...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 ml-1" />
                            تنفيذ الأمر
                          </>
                        )}
                      </Button>
                      <Button
                        onClick={() => setTestCommand("")}
                        variant="outline"
                        size="sm"
                        className="arabic-text"
                      >
                        مسح
                      </Button>
                    </div>
                  </div>

                  {/* Quick Test Commands */}
                  <div className="space-y-2">
                    <div className="text-xs text-gray-500 arabic-text">
                      أوامر سريعة للاختبار:
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-400 arabic-text">
                        أوامر الإضافة:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[
                          "اكتب بسم الله الرحمن الرحيم",
                          "أضف في البداية الحمد لله",
                          "اكتب بعد كلمة الحمد كلمة لله",
                          "ضع قبل كلمة الله كلمة رب",
                        ].map((cmd, idx) => (
                          <Button
                            key={idx}
                            onClick={() => setTestCommand(cmd)}
                            variant="outline"
                            size="sm"
                            className="text-xs arabic-text h-7"
                          >
                            {cmd}
                          </Button>
                        ))}
                      </div>

                      <div className="text-xs text-gray-400 arabic-text">
                        أوامر الاستبدال:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[
                          "استبدل كلمة بسم بكلمة باسم",
                          "غي�� كلمة الله إلى الله تعالى",
                        ].map((cmd, idx) => (
                          <Button
                            key={idx}
                            onClick={() => setTestCommand(cmd)}
                            variant="outline"
                            size="sm"
                            className="text-xs arabic-text h-7"
                          >
                            {cmd}
                          </Button>
                        ))}
                      </div>

                      <div className="text-xs text-gray-400 arabic-text">
                        أوامر الحذف:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {["امسح آخر شي", "احذف كلمة الرحيم"].map((cmd, idx) => (
                          <Button
                            key={idx}
                            onClick={() => setTestCommand(cmd)}
                            variant="outline"
                            size="sm"
                            className="text-xs arabic-text h-7"
                          >
                            {cmd}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Document Editor */}
          <div className="lg:col-span-2">
            <Card className="h-[600px] flex flex-col">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2 arabic-text">
                  <FileText className="w-5 h-5" />
                  محرر الوثيقة
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={downloadDocument}
                    variant="outline"
                    size="sm"
                    className="arabic-text"
                  >
                    <Download className="w-4 h-4 ml-1" />
                    تنزيل
                  </Button>
                  <Button
                    onClick={() => setDocumentContent("")}
                    variant="outline"
                    size="sm"
                    className="arabic-text"
                  >
                    مس�� الك��
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <div className="flex-1 border rounded-lg">
                  <Textarea
                    value={documentContent}
                    onChange={(e) => setDocumentContent(e.target.value)}
                    className="w-full h-full resize-none border-0 arabic-text arabic-scroll text-lg leading-relaxed"
                    placeholder="ابدأ الحديث أو اكتب هنا... سيظهر النص المُدخل بالصوت هنا تلقائياً"
                    dir="rtl"
                  />
                </div>

                {/* Document Stats */}
                <div className="mt-4 flex justify-between text-sm text-gray-500 arabic-text">
                  <span>
                    عدد الكلمات:{" "}
                    {
                      documentContent
                        .trim()
                        .split(/\s+/)
                        .filter((word) => word.length > 0).length
                    }
                  </span>
                  <span>عدد الأحرف: {documentContent.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Commands Guide */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="arabic-text flex items-center gap-2">
              <Brain className="w-5 h-5" />
              دليل الأوامر الذكية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200 arabic-text">
                <Brain className="w-4 h-4 inline ml-1" />
                <strong>مع الذكاء الاص��ناعي:</strong> يمكنك استخدام أي صياغة
                طبيعية باللغة العربية. النظام ��يفهم مقصدك ويحلل الأمر بذكاء.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm arabic-text">
              <div className="space-y-2">
                <h4 className="font-semibold text-blue-600">أوامر الحذف</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                  <li>• "امسح الفقرة الأخيرة"</li>
                  <li>• "احذف كل شيء"</li>
                  <li>• "إزالة النص الأخير"</li>
                  <li>• "شيل هذا ا��كلام"</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-green-600">أوامر الإضافة</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                  <li>• "أضف عن��ان جديد"</li>
                  <li>• "��كتب نص جديد"</li>
                  <li>• "ضع هذا النص"</li>
                  <li>• مجرد التحدث بالنص</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-purple-600">أوامر التنسيق</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                  <li>• "عنوان: العنوان هنا"</li>
                  <li>• "استبدل كلمة بأخرى"</li>
                  <li>• "غير النص"</li>
                  <li>• "خلي هذا عنوان"</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-semibold text-red-600">أو��مر التحكم</h4>
                <ul className="space-y-1 text-gray-600 dark:text-gray-300">
                  <li>• "ت��قف" - إيقاف التسجيل</li>
                  <li>• "استمرار" - وضع مستمر</li>
                  <li>• "خلاص" - إنهاء العملية</li>
                  <li>• "كفاية" - إيقاف</li>
                </ul>
              </div>
            </div>

            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm text-green-800 dark:text-green-200 arabic-text">
                <Zap className="w-4 h-4 inline ml-1" />
                <strong>ميزة ذكية:</strong> النظام يتعلم من سياق النص الحالي
                ويفهم الأوامر حتى لو لم تكن دقيقة!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

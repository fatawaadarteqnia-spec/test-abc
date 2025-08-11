import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { analyzeCommandMultiAI, getProviderStatus, testProvider, analyzeWithProvider, testAPIKeyDirect, saveAPIKey, clearAPIKey } from "./routes/multi-ai";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    try {
      const aiProviders = [];
      if (process.env.DEEPSEEK_API_KEY) aiProviders.push("DeepSeek");
      if (process.env.GEMINI_API_KEY) aiProviders.push("Gemini");
      if (process.env.OPENAI_API_KEY) aiProviders.push("OpenAI");
      if (process.env.GROQ_API_KEY) aiProviders.push("Groq");
      if (process.env.ANTHROPIC_API_KEY) aiProviders.push("Claude");

      const message = aiProviders.length > 0
        ? `🤖 AI Ready: ${aiProviders.join(', ')}`
        : "⚠️ No AI configured - using basic analysis";

      res.json({
        message,
        providers: aiProviders,
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        error: 'Server error',
        status: 'error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: 'healthy',
      server: 'running',
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/demo", handleDemo);

  // Multi-AI command analysis endpoints
  app.post("/api/analyze-command", analyzeCommandMultiAI);
  app.get("/api/ai-status", getProviderStatus);

  // Individual provider testing and usage
  app.get("/api/test-provider/:providerName", testProvider);
  app.post("/api/test-api-key/:providerName", testAPIKeyDirect);
  app.post("/api/save-api-key/:providerName", saveAPIKey);
  app.delete("/api/clear-api-key/:providerName", clearAPIKey);
  app.post("/api/analyze-with/:providerName", analyzeWithProvider);

  return app;
}

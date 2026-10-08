import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const port = 3000;

// Body parser with 50mb limit for high-res screenshots and image crops
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Enable CORS for Chrome Extension requests
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-goog-api-key");
  if (_req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Initialize Google GenAI
const apiKey = process.env.GEMINI_API_KEY;
let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// API: OCR Endpoint
app.post("/api/ocr", async (req, res) => {
  try {
    const { image, mode = "standard", options = {}, apiKey: clientApiKey } = req.body;
    const headerApiKey = req.headers["x-gemini-api-key"] as string | undefined;
    const effectiveApiKey = clientApiKey || headerApiKey || apiKey;

    if (!image) {
      return res.status(400).json({ error: "Missing image data" });
    }

    // Extract base64 and mime type
    let mimeType = "image/jpeg";
    let base64Data = image;

    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      } else {
        base64Data = image.split(",")[1] || image;
      }
    }

    // Base prompt according to mode - concise to minimize latency
    let systemPrompt = `You are a high-speed, high-precision OCR engine.
Extract all visible text from the image accurately.
1. Preserve original reading order, bullet points, numbers, punctuation, and line breaks.
2. Accurately transcribe Chinese (Simplified/Traditional) and English.
3. If table/columns, output clean Markdown.
4. Output ONLY the extracted text, no commentary, no wrapper tags.`;

    if (mode === "highlight_only") {
      systemPrompt += `\nFOCUS: Only extract text highlighted with colors (marker/pen).`;
    } else if (mode === "merge_paragraphs") {
      systemPrompt += `\nFOCUS: Merge lines belonging to the same sentence into continuous paragraphs.`;
    } else if (mode === "markdown_structured") {
      systemPrompt += `\nFOCUS: Structure with clear Markdown headers and lists.`;
    }

    if (options.instruction) {
      systemPrompt += `\nSPECIAL: ${options.instruction}`;
    }

    // Mode adjustments
    const isZeroMode = Boolean(options.pureZeroToken && !options.forceAi && mode !== "markdown_structured");

    if (!effectiveApiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured in environment or request.",
        fallback: true,
      });
    }

    // Use client custom key if provided, or default instance
    const clientAI = (effectiveApiKey === apiKey && ai)
      ? ai
      : new GoogleGenAI({
          apiKey: effectiveApiKey,
          httpOptions: { headers: { "User-Agent": "aistudio-build" } },
        });

    const imagePart = {
      inlineData: {
        mimeType,
        data: base64Data,
      },
    };

    const textPart = {
      text: systemPrompt,
    };

    // Fastest vision models: gemini-2.5-flash and gemini-3.8-flash with thinkingBudget: 0
    const modelsToTry = ["gemini-2.5-flash", "gemini-3.8-flash", "gemini-flash-latest"];
    let lastError: any = null;
    let extractedText = "";
    let tokenUsage = { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 };

    for (const model of modelsToTry) {
      try {
        const response = await clientAI.models.generateContent({
          model,
          contents: { parts: [imagePart, textPart] },
          config: {
            temperature: 0.1,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        });
        extractedText = response.text || "";
        if (response.usageMetadata) {
          tokenUsage = {
            promptTokens: response.usageMetadata.promptTokenCount || 0,
            candidatesTokens: response.usageMetadata.candidatesTokenCount || 0,
            totalTokens: response.usageMetadata.totalTokenCount || 0,
          };
        }
        lastError = null;
        break; // Success
      } catch (err: any) {
        console.warn(`Model ${model} attempt failed:`, err?.message || err);
        lastError = err;
      }
    }

    if (lastError && !extractedText) {
      throw lastError;
    }

    const returnedTokens = isZeroMode ? 0 : tokenUsage.totalTokens;
    const returnedUsage = isZeroMode
      ? { promptTokens: 0, candidatesTokens: 0, totalTokens: 0 }
      : tokenUsage;

    return res.json({
      text: extractedText.trim(),
      charCount: extractedText.length,
      lineCount: extractedText.split("\n").filter((l) => l.trim().length > 0).length,
      mode: isZeroMode ? "standard_zero_token" : mode,
      usage: returnedUsage,
      tokensUsed: returnedTokens,
      isZeroToken: isZeroMode,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error("OCR API Error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to process OCR request",
    });
  }
});

// API: Check status
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(apiKey),
    timestamp: new Date().toISOString(),
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();

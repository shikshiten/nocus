import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";
import { createClient as createTursoClient } from "@libsql/client/web";
import { createClerkClient } from "@clerk/backend";

dotenv.config();

const clerkSecret = (process.env.CLERK_SECRET_KEY || "").trim();
const clerkBackend = clerkSecret ? createClerkClient({ secretKey: clerkSecret }) : null;

// Lazy initialization of the OpenAI client
let openaiClient: OpenAI | null = null;
function getOpenAIClient(): OpenAI | null {
  const key = (process.env.OPENAI_API_KEY || "").trim();
  if (!key) return null;
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: key });
  }
  return openaiClient;
}

// Lazy initialization of the Gemini SDK client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    const key = (process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "").trim();
    if (!key) {
      throw new Error("AI service is currently unavailable.");
    }
    // Initialize standard GoogleGenAI client with API key auth
    aiClient = new GoogleGenAI({
      apiKey: key
    });
  }
  return aiClient;
}

// Keep track of models that have hit daily quota limits or are exhausted
const exhaustedModels = new Set<string>();

async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: any,
  maxRetries = 3,
  delayMs = 1500
): Promise<any> {
  const initialModel = params.model || "gemini-2.5-flash";
  
  // Define fallback models to try if the initial model fails or is overloaded
  const fallbackCandidates = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-flash-latest",
    "gemini-flash-lite-latest"
  ];
  
  // Ensure we try the initial model first, followed by the rest of the candidates in order
  const allCandidates = [
    initialModel,
    ...fallbackCandidates.filter(m => m !== initialModel)
  ];

  // Prioritize candidates that are NOT currently marked as exhausted
  const modelsToTry = [
    ...allCandidates.filter(m => !exhaustedModels.has(m)),
    ...allCandidates.filter(m => exhaustedModels.has(m))
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    console.log(`Attempting Gemini generation using model: ${model}`);
    const currentParams = { ...params, model };
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        const response = await ai.models.generateContent(currentParams);
        console.log(`Successfully generated content using model: ${model}`);
        return response;
      } catch (error: any) {
        attempt++;
        lastError = error;
        console.error(`Gemini call failed (attempt ${attempt}/${maxRetries}) for model ${model}:`, error);

        const errString = error ? String(error) : "";

        const isAuthError = 
          error?.status === 401 ||
          error?.code === 401 ||
          error?.status === "UNAUTHENTICATED" ||
          error?.error?.status === "UNAUTHENTICATED" ||
          errString.includes("401") ||
          errString.includes("UNAUTHENTICATED") ||
          errString.includes("ACCESS_TOKEN_TYPE_UNSUPPORTED");

        if (isAuthError) {
          console.error("AI API Authentication Failed.");
          throw new Error("AI service authentication error. Please try again later.");
        }

        const isQuotaExceeded = 
          error?.status === "RESOURCE_EXHAUSTED" ||
          error?.code === 429 ||
          error?.error?.status === "RESOURCE_EXHAUSTED" ||
          error?.error?.code === 429 ||
          errString.includes("429") ||
          errString.includes("RESOURCE_EXHAUSTED") ||
          errString.includes("Quota exceeded") ||
          errString.includes("quota");

        if (isQuotaExceeded) {
          console.warn(`Model ${model} hit quota limits or is exhausted. Demoting model and proceeding immediately to fallback.`);
          exhaustedModels.add(model);
          // Do not retry this model anymore, break immediately to try the next candidate
          break;
        }

        const isTransient = 
          error?.status === "UNAVAILABLE" || 
          error?.code === 503 ||
          error?.error?.status === "UNAVAILABLE" ||
          error?.error?.code === 503 ||
          errString.includes("503") ||
          errString.includes("UNAVAILABLE") ||
          errString.includes("high demand") ||
          errString.includes("temporary");

        if (isTransient && attempt < maxRetries) {
          const waitTime = delayMs * Math.pow(2, attempt - 1);
          console.log(`Waiting ${waitTime}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
        } else {
          // If not transient or we ran out of retries on this model, break and let the outer loop try the next fallback model
          break;
        }
      }
    }
    console.warn(`Model ${model} failed. Trying next fallback model...`);
  }

  // If we reach here, all fallback models failed
  console.error("All Gemini candidate models failed.");
  throw lastError || new Error("All Gemini models failed to generate content.");
}

function cleanAndParseJSON(text: string): any {
  let cleaned = text.trim();
  
  // Remove markdown block wraps if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "");
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.replace(/\n?```$/, "");
  }
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Attempt regex matching to extract the JSON block
    const jsonMatch = cleaned.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      const candidate = jsonMatch[1].trim();
      try {
        return JSON.parse(candidate);
      } catch (innerErr) {
        // Find balanced braces matching the first open brace
        let braceCount = 0;
        let inString = false;
        let escape = false;
        let endIndex = -1;

        for (let i = 0; i < candidate.length; i++) {
          const char = candidate[i];
          if (escape) {
            escape = false;
            continue;
          }
          if (char === "\\") {
            escape = true;
            continue;
          }
          if (char === '"') {
            inString = !inString;
            continue;
          }
          if (!inString) {
            if (char === "{") {
              braceCount++;
            } else if (char === "}") {
              braceCount--;
              if (braceCount === 0) {
                endIndex = i;
                break;
              }
            }
          }
        }

        if (endIndex !== -1) {
          const substringCandidate = candidate.substring(0, endIndex + 1);
          try {
            return JSON.parse(substringCandidate);
          } catch (subErr) {
            const sanitized = substringCandidate
              .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // remove control characters
              .replace(/,\s*([\]}])/g, "$1"); // remove trailing commas
            try {
              return JSON.parse(sanitized);
            } catch (sanErr) {
              throw innerErr;
            }
          }
        }
        throw innerErr;
      }
    }
    throw err;
  }
}

async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  // 1. Try PDFParse (handles flate-decode, font mappings, and multi-page layouts)
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse(new Uint8Array(buffer));
    const result = await parser.getText();
    if (result && result.text && result.text.trim().length >= 30) {
      return result.text.trim();
    }
  } catch (err) {
    console.warn("PDFParse extraction error, falling back to stream regex:", err);
  }

  // 2. Pure JS stream regex fallback
  try {
    const content = buffer.toString("latin1");
    let extracted = "";
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;
    while ((match = streamRegex.exec(content)) !== null) {
      const stream = match[1];
      const btRegex = /BT[\r\n\s]+([\s\S]*?)[\r\n\s]+ET/g;
      let btMatch: RegExpExecArray | null;
      while ((btMatch = btRegex.exec(stream)) !== null) {
        const btBlock = btMatch[1];
        const tjRegex = /\(([^)]+)\)\s*Tj/g;
        let tjMatch: RegExpExecArray | null;
        while ((tjMatch = tjRegex.exec(btBlock)) !== null) {
          extracted += tjMatch[1] + " ";
        }
        const tjArrRegex = /\[([^\]]+)\]\s*TJ/g;
        let arrMatch: RegExpExecArray | null;
        while ((arrMatch = tjArrRegex.exec(btBlock)) !== null) {
          const strRegex = /\(([^)]+)\)/g;
          let sMatch: RegExpExecArray | null;
          while ((sMatch = strRegex.exec(arrMatch[1])) !== null) {
            extracted += sMatch[1];
          }
          extracted += " ";
        }
      }
    }
    if (extracted.trim().length >= 30) {
      return extracted.trim();
    }
  } catch (e) {
    // ignore
  }

  return "";
}

function normalizeSyllabusData(raw: any, fallbackName = "Syllabus"): { subjectName: string; units: Array<{ name: string; topics: string[] }> } {
  if (!raw) return { subjectName: fallbackName, units: [] };

  let unitsRaw: any[] = [];
  let subjectName = fallbackName;

  if (Array.isArray(raw)) {
    unitsRaw = raw;
  } else if (typeof raw === "object") {
    subjectName = 
      raw.subjectName ||
      raw.subject ||
      raw.courseName ||
      raw.courseTitle ||
      raw.course ||
      raw.title ||
      raw.name ||
      fallbackName;

    if (Array.isArray(raw.units)) {
      unitsRaw = raw.units;
    } else if (Array.isArray(raw.modules)) {
      unitsRaw = raw.modules;
    } else if (Array.isArray(raw.chapters)) {
      unitsRaw = raw.chapters;
    } else if (Array.isArray(raw.sections)) {
      unitsRaw = raw.sections;
    } else if (Array.isArray(raw.syllabus)) {
      unitsRaw = raw.syllabus;
    } else if (Array.isArray(raw.curriculum)) {
      unitsRaw = raw.curriculum;
    } else {
      for (const key of Object.keys(raw)) {
        if (Array.isArray(raw[key]) && raw[key].length > 0) {
          unitsRaw = raw[key];
          if (subjectName === fallbackName && key !== "units") {
            subjectName = key;
          }
          break;
        }
      }
    }
  }

  const normalizedUnits = unitsRaw.map((u: any, idx: number) => {
    if (typeof u === "string") {
      return {
        name: `Unit ${idx + 1}: ${u}`,
        topics: [u]
      };
    }

    const unitNum = u.unitNumber || u.unit || u.number || (idx + 1);
    const unitTitle = u.name || u.title || u.unitName || u.moduleName || u.chapterName || u.sectionName || "";
    const cleanUnitName = unitTitle.toLowerCase().includes("unit") || unitTitle.toLowerCase().includes("module") || unitTitle.toLowerCase().includes("chapter")
      ? unitTitle
      : `Unit ${unitNum}: ${unitTitle || "General Topics"}`;

    let rawTopics = u.topics || u.subtopics || u.subTopics || u.concepts || u.items || u.chapters || u.content || [];
    if (!Array.isArray(rawTopics)) {
      if (typeof rawTopics === "string") {
        rawTopics = rawTopics.split(/[\n,;•-]+/).map(s => s.trim()).filter(Boolean);
      } else {
        rawTopics = [];
      }
    }

    const cleanTopics = rawTopics
      .map((t: any) => {
        if (typeof t === "string") return t.trim();
        if (t && typeof t === "object") {
          return (t.name || t.title || t.topic || t.topicName || t.concept || t.item || JSON.stringify(t)).trim();
        }
        return String(t).trim();
      })
      .filter((t: string) => t.length > 0);

    return {
      name: cleanUnitName.trim(),
      topics: cleanTopics.length > 0 ? cleanTopics : ["Key Concepts & Fundamentals"]
    };
  }).filter(u => u.name && u.topics.length > 0);

  return {
    subjectName: (subjectName || fallbackName).trim(),
    units: normalizedUnits
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set body payload limits (25MB is plenty for multi-page PDF documents)
  app.use(express.json({ limit: "25mb" }));
  app.use(express.urlencoded({ extended: true, limit: "25mb" }));

  // Strict CORS headers
  app.use((req, res, next) => {
    const origin = req.headers.origin || "";
    // Allow local development and production hosted domains
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  // In-memory rate limiting map for AI endpoints
  const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
  function checkRateLimit(ip: string, maxRequests = 20, windowMs = 60000): boolean {
    const now = Date.now();
    const record = rateLimitMap.get(ip);
    if (!record || now > record.resetAt) {
      rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (record.count >= maxRequests) {
      return false;
    }
    record.count++;
    return true;
  }

  // Helper to authenticate Clerk session token from Authorization: Bearer <token>
  async function authenticateUser(req: express.Request): Promise<string | null> {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }
    const token = authHeader.split(" ")[1];
    if (!token) return null;

    if (clerkBackend) {
      try {
        const decoded = await clerkBackend.verifyToken(token);
        if (decoded && decoded.sub) {
          return decoded.sub;
        }
      } catch (err) {
        console.warn("Clerk token verification note:", err);
      }
    }
    return null;
  }

  // API Route: Check Server Health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Smart Syllabus Parsing via Gemini
  app.post("/api/parse-syllabus", async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(clientIp, 15, 60000)) {
        return res.status(429).json({ error: "Too many parsing requests. Please wait a moment and try again." });
      }

      const { pdfBase64, mimeType, syllabusText } = req.body;

      if (!pdfBase64 && !syllabusText) {
        return res.status(400).json({ error: "Syllabus content is required (pdfBase64 or syllabusText)." });
      }

      const ai = getAIClient();
      let contents: any[] = [];

      const prompt = `You are an expert academic curriculum assistant. Parse the provided syllabus document completely and organize ALL Units, Modules, Chapters, and Topics into a highly structured JSON format.
Analyze the ENTIRE document thoroughly across all pages. Do NOT stop after the first unit or skip any sections.
Extract every single Unit/Module/Chapter (e.g. Unit 1, Unit 2, Unit 3, Unit 4, Unit 5, etc.) and all corresponding sub-topics under each unit.
Group the topics logically under their respective Units. If there are no explicit units, create logical units based on the subject's major chapters or themes.
Keep the unit names descriptive (e.g. "Unit 1: Digital Fundamentals"), and keep each topic short, clear, and action-oriented (maximum 10 words per topic).

Return ONLY a JSON object with this exact structure:
{
  "subjectName": string, // Name of the course/subject, e.g. "Digital Electronics"
  "units": Array<{
    "name": string, // Name of the Unit, e.g. "Unit 1: Introduction to Logic Gates"
    "topics": string[] // List of distinct topics to learn in this unit
  }>
}

Ensure the response contains no markdown block characters (like \`\`\`json) and is valid, pure JSON.`;

      if (pdfBase64) {
        const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, "");
        const pdfBuffer = Buffer.from(cleanBase64, "base64");
        
        // Attempt text extraction from the PDF first
        const extractedText = await extractTextFromPdfBuffer(pdfBuffer);
        if (extractedText && extractedText.length >= 30) {
          console.log(`Extracted ${extractedText.length} characters of text from PDF. Parsing text with Gemini...`);
          contents = [
            `Syllabus Document Text:\n${extractedText}\n\n${prompt}`
          ];
        } else {
          console.log("PDF contains little or no text streams (likely scanned). Passing raw PDF to Gemini vision OCR...");
          contents = [
            {
              inlineData: {
                mimeType: mimeType || "application/pdf",
                data: cleanBase64
              }
            },
            { text: prompt }
          ];
        }
      } else {
        contents = [
          `Syllabus Copy-Pasted Text:\n${syllabusText}\n\n${prompt}`
        ];
      }

      console.log("Parsing syllabus using Google Gemini with structured JSON output...");
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-3.8-flash',
        contents,
        config: {
          maxOutputTokens: 8192,
          responseMimeType: 'application/json'
        }
      });

      const responseText = response.text || "";
      let parsedData;
      try {
        parsedData = cleanAndParseJSON(responseText);
      } catch (parseErr) {
        console.error("Failed to parse AI response JSON. Output was:", responseText);
        return res.status(500).json({
          error: "Unable to parse this syllabus automatically. Please ensure the document is clear, or paste the text directly."
        });
      }

      const normalized = normalizeSyllabusData(parsedData, "Syllabus Course");
      console.log(`Successfully parsed syllabus: "${normalized.subjectName}" with ${normalized.units.length} units.`);
      res.json(normalized);
    } catch (error: any) {
      console.error("Error in parse-syllabus endpoint:", error);
      res.status(500).json({ 
        error: "Unable to parse this syllabus automatically. Please ensure the document is clear, or paste the text directly." 
      });
    }
  });

  // API Route: Scan Syllabus from Multiple Images (with OCR confidence flagging)
  app.post("/api/scan-syllabus", async (req, res) => {
    try {
      const clientIp = req.ip || req.socket.remoteAddress || "unknown";
      if (!checkRateLimit(clientIp, 15, 60000)) {
        return res.status(429).json({ error: "Too many scanning requests. Please wait a moment and try again." });
      }

      const { images } = req.body; // Array of { base64: string, mimeType: string }

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({ error: "Syllabus images are required." });
      }

      const openai = getOpenAIClient();
      if (openai) {
        try {
          console.log("Scanning syllabus images using OpenAI GPT-4o-mini Vision...");
          const imageContents: any[] = images.map((img: any) => {
            const cleanBase64 = img.base64.replace(/^data:[^;]+;base64,/, "");
            const mime = img.mimeType || "image/jpeg";
            return {
              type: "image_url",
              image_url: {
                url: `data:${mime};base64,${cleanBase64}`
              }
            };
          });

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are an expert academic curriculum and OCR assistant.
Analyze the provided syllabus image(s) (which may be printed or handwritten in English, Hindi, or mixed Hinglish) and extract the curriculum.

Follow these strict cleanup and parsing guidelines:
1. Clean the text by removing unnecessary headers, footers, page numbers, institutional logos, watermarks, stamps, and extra spaces.
2. Intelligently identify: Subject Name, Units/Chapters, and Topics inside each unit (under 10 words per topic).
3. Assess image quality: if any parts are blurry, handwritten or uncertain, set "isLowConfidence": true with a brief "confidenceReason". Otherwise "isLowConfidence": false.

Return ONLY a JSON object with this exact structure:
{
  "subjectName": "string",
  "units": [
    {
      "name": "string",
      "topics": [
        {
          "name": "string",
          "isLowConfidence": false,
          "confidenceReason": "string"
        }
      ]
    }
  ]
}`
              },
              {
                role: "user",
                content: [
                  { type: "text", text: "Parse and structure the syllabus from these image(s):" },
                  ...imageContents
                ]
              }
            ],
            temperature: 0.2
          });

          const raw = completion.choices[0]?.message?.content || "{}";
          const parsed = cleanAndParseJSON(raw);
          if (parsed && parsed.subjectName && Array.isArray(parsed.units)) {
            return res.json(parsed);
          }
        } catch (openaiErr) {
          console.warn("OpenAI scan-syllabus failed, attempting Gemini fallback:", openaiErr);
        }
      }

      const ai = getAIClient();

      const prompt = `You are an expert academic curriculum and OCR assistant.
Analyze the provided syllabus image(s) (which may be printed or handwritten in English, Hindi, or mixed Hinglish) and extract the curriculum.

Follow these strict cleanup and parsing guidelines:
1. Clean the text by removing unnecessary headers, footers, page numbers, institutional logos, watermarks, stamps, and extra spaces.
2. Intelligently identify:
   - Subject/Course Name
   - Units/Chapters (with names)
   - Topics inside each unit. Keep each topic name short, clear, and action-oriented (maximum 10 words). Remove duplicate topics automatically.
3. If there are multiple images, merge their content in the correct sequential order.
4. Assess the quality of the image and the text. If any parts, words, or topics are handwritten, blurry, faded, hard to read, or parsed with low confidence:
   - Flag those specific topics with "isLowConfidence": true
   - Provide a brief "confidenceReason" describing why (e.g., "blurry image text", "unclear handwriting", "Hindi characters partially faded").
   - Otherwise, set "isLowConfidence": false.

Return ONLY a JSON object with this exact structure:
{
  "subjectName": string, // Name of the course/subject, e.g. "Data Structures"
  "units": Array<{
    "name": string, // Name of the unit, e.g. "Unit 1: Introduction"
    "topics": Array<{
      "name": string, // Name of the topic, e.g. "Arrays and Linked Lists"
      "isLowConfidence": boolean, // true if OCR confidence is low/handwritten/blurry, false otherwise
      "confidenceReason"?: string // Reason for low confidence
    }>
  }>
}

Ensure the response contains no markdown formatting characters (like \`\`\`json) and is valid, pure JSON.`;

      // Construct Gemini contents array with multiple images and prompt
      const contents: any[] = images.map((img: any) => {
        const cleanBase64 = img.base64.replace(/^data:[^;]+;base64,/, "");
        return {
          inlineData: {
            mimeType: img.mimeType || "image/jpeg",
            data: cleanBase64
          }
        };
      });

      // Append the prompt as the last part
      contents.push({ text: prompt });

      // Use fast multimodal model gemini-2.5-flash
      const response = await generateContentWithRetry(ai, {
        model: "gemini-flash-latest",
        contents,
        config: {
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subjectName: {
                type: Type.STRING,
                description: "Name of the course/subject"
              },
              units: {
                type: Type.ARRAY,
                description: "List of academic units extracted from the images",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Name of the unit"
                    },
                    topics: {
                      type: Type.ARRAY,
                      description: "Distinct topics inside this unit, with confidence metadata",
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          name: {
                            type: Type.STRING,
                            description: "Name of the topic"
                          },
                          isLowConfidence: {
                            type: Type.BOOLEAN,
                            description: "true if OCR confidence is low, blurred, or handwritten, false otherwise"
                          },
                          confidenceReason: {
                            type: Type.STRING,
                            description: "Reason for low confidence or handwriting detection if isLowConfidence is true"
                          }
                        },
                        required: ["name", "isLowConfidence"]
                      }
                    }
                  },
                  required: ["name", "topics"]
                }
              }
            },
            required: ["subjectName", "units"]
          }
        }
      });

      const responseText = response.text || "";
      let parsedData;
      try {
        parsedData = cleanAndParseJSON(responseText);
      } catch (parseErr) {
        console.error("Failed to parse scan AI response JSON. Output was:", responseText);
        return res.status(500).json({
          error: "Unable to scan the syllabus images. Please ensure the images are clear, or paste the text directly."
        });
      }

      res.json(parsedData);
    } catch (error: any) {
      console.error("Error in scan-syllabus endpoint:", error);
      res.status(500).json({
        error: "Unable to scan the syllabus images. Please ensure the images are clear, or paste the text directly."
      });
    }
  });

  // API Route: Generate Custom SVG Avatar via OpenAI or Gemini
  app.post("/api/generate-avatar", async (req, res) => {
    try {
      const { prompt } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required." });
      }

      const openai = getOpenAIClient();
      if (openai) {
        try {
          console.log("Generating avatar using OpenAI GPT-4o-mini...");
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `You are an expert graphic designer and SVG illustrator.
Your task is to generate a beautiful, creative, modern, and clean vector avatar SVG based on the user's prompt.
Follow these strict design guidelines:
1. Output ONLY a valid, self-contained SVG string starting with "<svg" and ending with "</svg>". Do NOT wrap it in any markdown blocks (like \`\`\`xml or \`\`\`html) or any other conversational text.
2. The SVG MUST have a viewBox="0 0 100 100", width="100%", height="100%", and look premium and professional.
3. Use modern design elements like soft gradients, clean geometric shapes, beautiful colors, and high contrast.
4. Ensure the SVG is well-formed, valid, and uses standard tags like <rect>, <circle>, <path>, <defs>, <linearGradient>, etc.`
              },
              {
                role: "user",
                content: `Create an avatar SVG for: "${prompt}"`
              }
            ],
            temperature: 0.7
          });

          let svgText = completion.choices[0]?.message?.content || "";
          svgText = svgText.trim().replace(/^```(?:xml|html|svg)?\n?/, "").replace(/\n?```$/, "").trim();
          const match = svgText.match(/<svg[\s\S]*<\/svg>/);
          if (match) {
            return res.json({ svg: match[0] });
          }
        } catch (openaiErr) {
          console.warn("OpenAI avatar gen failed, falling back to Gemini:", openaiErr);
        }
      }

      const ai = getAIClient();

      const systemPrompt = `You are an expert graphic designer and SVG illustrator.
Your task is to generate a beautiful, creative, modern, and clean vector avatar SVG based on the user's prompt.
Follow these strict design guidelines:
1. Output ONLY a valid, self-contained SVG string starting with "<svg" and ending with "</svg>". Do NOT wrap it in any markdown blocks (like \`\`\`xml or \`\`\`html) or any other conversational text.
2. The SVG MUST have a viewBox="0 0 100 100", width="100%", height="100%", and look premium and professional.
3. Use modern design elements like soft gradients, clean geometric shapes, beautiful colors, and high contrast.
4. The avatar should represent the user's prompt creatively: "${prompt}".
5. Ensure the SVG is well-formed, valid, and uses standard tags like <rect>, <circle>, <path>, <defs>, <linearGradient>, etc. Use appropriate inline styling or presentation attributes.`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-flash-latest",
        contents: [systemPrompt]
      });

      let svgText = response.text || "";
      svgText = svgText.trim();
      
      // Clean up potential markdown formatting
      if (svgText.startsWith("```")) {
        svgText = svgText.replace(/^```(?:xml|html|svg)?\n?/, "");
      }
      if (svgText.endsWith("```")) {
        svgText = svgText.replace(/\n?```$/, "");
      }
      svgText = svgText.trim();

      if (!svgText.startsWith("<svg")) {
        // Fallback: if model returned something else, find the <svg> block
        const match = svgText.match(/<svg[\s\S]*<\/svg>/);
        if (match) {
          svgText = match[0];
        } else {
          throw new Error("Failed to generate valid vector graphics. SVG block not found.");
        }
      }

      res.json({ svg: svgText });
    } catch (error: any) {
      console.error("Error in generate-avatar endpoint:", error);
      res.status(500).json({
        error: "Unable to generate custom avatar right now. Please try again later."
      });
    }
  });

  // API Route: Generate Custom Motivational Quote via OpenAI or Gemini
  app.post("/api/generate-quote", async (req, res) => {
    try {
      const { timeOfDay } = req.body;

      const openai = getOpenAIClient();
      if (openai) {
        try {
          console.log("Generating quote using OpenAI GPT-4o-mini...");
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are an expert motivational coach, academic advisor, and inspiring writer.
Generate a highly inspiring, fresh study quote tailored for the time of day: "${timeOfDay || "morning"}".
Output ONLY a JSON object with exactly two keys: "quote" (under 130 characters) and "author".`
              },
              {
                role: "user",
                content: `Provide an inspiring motivational study quote for ${timeOfDay || "morning"}`
              }
            ],
            temperature: 0.8
          });

          const raw = completion.choices[0]?.message?.content || "{}";
          const data = JSON.parse(raw);
          if (data.quote && data.author) {
            return res.json(data);
          }
        } catch (openaiErr) {
          console.warn("OpenAI quote gen failed, falling back to Gemini:", openaiErr);
        }
      }

      const ai = getAIClient();

      const systemPrompt = `You are an expert motivational coach, academic advisor, and inspiring writer.
Your task is to generate a highly inspiring, fresh, and powerful motivational study quote specifically tailored for the time of day: "${timeOfDay || "morning"}".
Follow these strict guidelines:
1. The quote should be deeply encouraging, focus-oriented, and related to learning, persistence, growth mindset, or productivity.
2. Keep the quote concise (under 130 characters).
3. Provide a realistic or famous author (e.g. Marie Curie, Socrates, Thomas Edison, Ralph Waldo Emerson, or an inspiring study persona like "Zen Focus Advisor" or "Syllabus Mentor").
4. Output your response ONLY as a valid, parsable JSON object with exactly two keys: "quote" and "author". Do NOT wrap it in any markdown blocks (like \`\`\`json) or include any other text.
Example format:
{"quote": "Continuous effort, not strength or intelligence, is the key to unlocking our potential.", "author": "Winston Churchill"}`;

      const response = await generateContentWithRetry(ai, {
        model: "gemini-flash-latest",
        contents: [systemPrompt],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              quote: {
                type: Type.STRING,
                description: "Highly inspiring motivational study quote (under 130 characters)"
              },
              author: {
                type: Type.STRING,
                description: "Realistic/famous author or an inspiring study persona"
              }
            },
            required: ["quote", "author"]
          }
        }
      });

      let responseText = response.text || "{}";
      responseText = responseText.trim();

      // Clean markdown if any
      if (responseText.startsWith("```")) {
        responseText = responseText.replace(/^```(?:json)?\n?/, "");
      }
      if (responseText.endsWith("```")) {
        responseText = responseText.replace(/\n?```$/, "");
      }
      responseText = responseText.trim();

      const data = JSON.parse(responseText);
      if (!data.quote || !data.author) {
        throw new Error("Invalid output format from AI model.");
      }

      res.json(data);
    } catch (error: any) {
      console.error("Error in generate-quote endpoint:", error);
      res.status(500).json({
        error: "Unable to generate custom quote right now. Please try again later."
      });
    }
  });

  // ============================================
  // Cloudflare R2 Vault API Routes (Secure)
  // ============================================

  // Initialize R2 (S3-compatible) client
  const r2Client = process.env.R2_ACCOUNT_ID ? new S3Client({
    region: "auto",
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
    },
  }) : null;

  const R2_BUCKET = process.env.R2_BUCKET_NAME || "nocus";

  // Generate presigned upload URL
  app.post("/api/vault/upload-url", async (req, res) => {
    try {
      if (!r2Client) {
        return res.status(503).json({ error: "Storage service is currently unavailable." });
      }

      const verifiedUserId = await authenticateUser(req);
      const { fileName, fileSize, mimeType, userId } = req.body;
      const targetUserId = verifiedUserId || userId;

      if (!fileName || !targetUserId) {
        return res.status(400).json({ error: "fileName and userId are required." });
      }

      const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
      const actualSize = Number(fileSize) || 0;
      if (actualSize <= 0 || actualSize > MAX_SIZE) {
        return res.status(400).json({ error: "File size exceeds the 5MB limit or is invalid." });
      }

      // Restrict mime type
      const allowedMimes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
      if (mimeType && !allowedMimes.includes(mimeType)) {
        return res.status(400).json({ error: "Only PDF documents and images are allowed." });
      }

      // Generate a sanitized unique key strictly bound to targetUserId
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileKey = `${targetUserId}/${Date.now()}_${sanitizedName}`;

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileKey,
        ContentType: mimeType || "application/pdf",
        ContentLength: actualSize,
      });

      const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 }); // 5 min expiry
      res.json({ uploadUrl, fileKey });
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate upload URL." });
    }
  });

  // Generate presigned download URL
  app.get("/api/vault/download-url/:fileKey(*)", async (req, res) => {
    try {
      if (!r2Client) {
        return res.status(503).json({ error: "Storage service is currently unavailable." });
      }

      const verifiedUserId = await authenticateUser(req);
      const { fileKey } = req.params;

      if (!fileKey) {
        return res.status(400).json({ error: "fileKey is required." });
      }

      // Enforce ownership: If user is authenticated, ensure key begins with their user id
      if (verifiedUserId) {
        const filePrefix = fileKey.split("/")[0];
        if (filePrefix !== verifiedUserId && !fileKey.startsWith("local_")) {
          return res.status(403).json({ error: "Unauthorized access to file." });
        }
      }

      const command = new GetObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileKey,
        ResponseContentDisposition: "inline",
      });

      const downloadUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 }); // 1 hour expiry
      res.json({ downloadUrl });
    } catch (error: any) {
      console.error("Error generating download URL:", error);
      res.status(500).json({ error: "Failed to generate download URL." });
    }
  });

  // Delete file from R2
  app.delete("/api/vault/file/:fileKey(*)", async (req, res) => {
    try {
      if (!r2Client) {
        return res.status(503).json({ error: "Storage service is currently unavailable." });
      }

      const verifiedUserId = await authenticateUser(req);
      const { fileKey } = req.params;

      if (!fileKey) {
        return res.status(400).json({ error: "fileKey is required." });
      }

      // Enforce ownership: user can only delete their own file
      if (verifiedUserId) {
        const filePrefix = fileKey.split("/")[0];
        if (filePrefix !== verifiedUserId && !fileKey.startsWith("local_")) {
          return res.status(403).json({ error: "Unauthorized: You can only delete your own files." });
        }
      }

      const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileKey,
      });

      await r2Client.send(command);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting file from R2:", error);
      res.status(500).json({ error: "Failed to delete file from storage." });
    }
  });

  // Turso Database Client (Server-side only)
  const defaultTursoUrl = "https://nocus-shikshiten.aws-ap-south-1.turso.io";
  const defaultTursoToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiJhZTI2ZTkxYy0yZWIzLTQzOTctYTFmOS1jNDhiMzg4MzYzZGMiLCJpYXQiOjE3OTIwMDMxNzUsImtpZCI6ImFId2pRZzFWQ1ZLejB6OW55MVprRDhrYUR4UkhlOG1Ca2YwTkRQQnpTZGsiLCJyaWQiOiI1ZGU0ZjYwNy1hNTIxLTQ1ODktYTU2Mi01ZDU1N2Y4MGJlZjUifQ.g-_w5JnSYEI8F4sGpd71lfruwV4mMiJiOmGScpOzt1BEeRQdeh4mbkJFINICEwYlugWV0Wn3eeXbBeXa69FQCw";
  const rawTursoUrl = (process.env.TURSO_DATABASE_URL || process.env.VITE_TURSO_DATABASE_URL || defaultTursoUrl).trim();
  const tursoHttpUrl = rawTursoUrl.replace(/^libsql:\/\//, "https://");
  const tursoToken = (process.env.TURSO_AUTH_TOKEN || process.env.VITE_TURSO_AUTH_TOKEN || defaultTursoToken).trim();

  let tursoClient: any = null;
  try {
    tursoClient = createTursoClient({
      url: tursoHttpUrl,
      authToken: tursoToken,
    });
  } catch (err) {
    console.warn("Failed to initialize Turso client in server.ts:", err);
  }

  // Ensure Turso tables exist
  let tablesReady = false;
  async function ensureTables() {
    if (!tursoClient || tablesReady) return;
    try {
      await tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS syllabuses (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          subject_name TEXT NOT NULL,
          exam_date TEXT,
          daily_target INTEGER DEFAULT 4,
          weekly_target INTEGER DEFAULT 5,
          streak INTEGER DEFAULT 0,
          last_study_date TEXT,
          last_active_date TEXT,
          units TEXT,
          keep_notes TEXT,
          planned_topics_today TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await tursoClient.execute(`
        CREATE TABLE IF NOT EXISTS vault_files (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_key TEXT,
          file_size INTEGER DEFAULT 0,
          mime_type TEXT,
          folder TEXT DEFAULT 'General',
          tags TEXT,
          description TEXT,
          is_favorite INTEGER DEFAULT 0,
          is_trashed INTEGER DEFAULT 0,
          trashed_at TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);
      tablesReady = true;
    } catch (e) {
      console.warn("Table setup notice:", e);
    }
  }

  // ============================================
  // Syllabuses Sync Endpoints (Secure)
  // ============================================

  // GET /api/sync-syllabuses
  app.get("/api/sync-syllabuses", async (req, res) => {
    try {
      if (!tursoClient) {
        return res.status(503).json({ error: "Database unavailable" });
      }
      await ensureTables();

      const verifiedUserId = await authenticateUser(req);
      const queryUserId = req.query.userId || req.query.user_id;
      const targetUserId = verifiedUserId || queryUserId;

      if (!targetUserId) {
        return res.status(400).json({ error: "User authentication required" });
      }

      const result = await tursoClient.execute({
        sql: "SELECT * FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC",
        args: [String(targetUserId)],
      });

      const syllabuses = result.rows.map((row: any) => ({
        id: String(row.id),
        userId: String(row.user_id),
        subjectName: String(row.subject_name),
        units: typeof row.units === "string" ? JSON.parse(row.units) : row.units || [],
        examDate: row.exam_date ? String(row.exam_date) : undefined,
        dailyTarget: row.daily_target ? Number(row.daily_target) : 4,
        streak: row.streak ? Number(row.streak) : 0,
        lastStudyDate: row.last_study_date ? String(row.last_study_date) : undefined,
        keepNotes: typeof row.keep_notes === "string" ? JSON.parse(row.keep_notes) : row.keep_notes || [],
        plannedTopicsToday: typeof row.planned_topics_today === "string" ? JSON.parse(row.planned_topics_today) : row.planned_topics_today || [],
        createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
      }));

      return res.json({ syllabuses });
    } catch (err: any) {
      console.error("Server sync error (GET):", err);
      return res.status(500).json({ error: "Failed to load syllabuses from database" });
    }
  });

  // POST /api/sync-syllabuses
  app.post("/api/sync-syllabuses", async (req, res) => {
    try {
      if (!tursoClient) {
        return res.status(503).json({ error: "Database unavailable" });
      }
      await ensureTables();

      const verifiedUserId = await authenticateUser(req);
      const { syllabus, userId } = req.body || {};
      const targetUserId = verifiedUserId || userId;

      if (!syllabus || !targetUserId) {
        return res.status(400).json({ error: "Syllabus and valid authentication required" });
      }

      // Upsert scoped strictly to user_id to prevent cross-account record overwriting
      await tursoClient.execute({
        sql: `INSERT INTO syllabuses (id, user_id, subject_name, exam_date, daily_target, streak, last_study_date, units, keep_notes, planned_topics_today, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
              subject_name = excluded.subject_name,
              exam_date = excluded.exam_date,
              daily_target = excluded.daily_target,
              streak = excluded.streak,
              last_study_date = excluded.last_study_date,
              units = excluded.units,
              keep_notes = excluded.keep_notes,
              planned_topics_today = excluded.planned_topics_today,
              updated_at = CURRENT_TIMESTAMP
              WHERE syllabuses.user_id = excluded.user_id`,
        args: [
          syllabus.id,
          targetUserId,
          syllabus.subjectName,
          syllabus.examDate || null,
          syllabus.dailyTarget || 4,
          syllabus.streak || 0,
          syllabus.lastStudyDate || null,
          JSON.stringify(syllabus.units || []),
          JSON.stringify(syllabus.keepNotes || []),
          JSON.stringify(syllabus.plannedTopicsToday || []),
          syllabus.createdAt || new Date().toISOString(),
        ],
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Server sync error (POST):", err);
      return res.status(500).json({ error: "Failed to save syllabus to database" });
    }
  });

  // DELETE /api/sync-syllabuses
  app.delete("/api/sync-syllabuses", async (req, res) => {
    try {
      if (!tursoClient) {
        return res.status(503).json({ error: "Database unavailable" });
      }
      await ensureTables();

      const verifiedUserId = await authenticateUser(req);
      const id = req.query.id;
      const targetUserId = verifiedUserId || req.query.userId || req.query.user_id;

      if (!id || !targetUserId) {
        return res.status(400).json({ error: "id and authentication required" });
      }

      await tursoClient.execute({
        sql: "DELETE FROM syllabuses WHERE id = ? AND user_id = ?",
        args: [String(id), String(targetUserId)],
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Server sync error (DELETE):", err);
      return res.status(500).json({ error: "Failed to delete syllabus" });
    }
  });

  // ============================================
  // Vault Files Database Endpoints (Secure)
  // ============================================

  // GET /api/vault/files
  app.get("/api/vault/files", async (req, res) => {
    try {
      if (!tursoClient) {
        return res.status(503).json({ error: "Database unavailable" });
      }
      await ensureTables();

      const verifiedUserId = await authenticateUser(req);
      const targetUserId = verifiedUserId || req.query.userId || req.query.user_id;

      if (!targetUserId) {
        return res.status(400).json({ error: "Authentication required" });
      }

      const result = await tursoClient.execute({
        sql: "SELECT * FROM vault_files WHERE user_id = ? ORDER BY created_at DESC",
        args: [String(targetUserId)],
      });

      const files = result.rows.map((row: any) => ({
        id: String(row.id),
        userId: String(row.user_id),
        fileName: String(row.file_name),
        fileKey: String(row.file_key || ""),
        fileSize: Number(row.file_size || 0),
        mimeType: String(row.mime_type || "application/pdf"),
        folder: String(row.folder || "General"),
        tags: typeof row.tags === "string" ? JSON.parse(row.tags) : row.tags || [],
        description: row.description ? String(row.description) : undefined,
        isFavorite: Boolean(row.is_favorite),
        isTrashed: Boolean(row.is_trashed),
        trashedAt: row.trashed_at ? String(row.trashed_at) : undefined,
        createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
        updatedAt: row.updated_at ? String(row.updated_at) : new Date().toISOString(),
      }));

      return res.json({ files });
    } catch (err: any) {
      console.error("Server vault files error (GET):", err);
      return res.status(500).json({ error: "Failed to load vault files" });
    }
  });

  // POST /api/vault/files
  app.post("/api/vault/files", async (req, res) => {
    try {
      if (!tursoClient) {
        return res.status(503).json({ error: "Database unavailable" });
      }
      await ensureTables();

      const verifiedUserId = await authenticateUser(req);
      const { file, userId } = req.body || {};
      const targetUserId = verifiedUserId || userId;

      if (!file || !targetUserId) {
        return res.status(400).json({ error: "File and valid authentication required" });
      }

      await tursoClient.execute({
        sql: `INSERT INTO vault_files (id, user_id, file_name, file_key, file_size, mime_type, folder, tags, description, is_favorite, is_trashed, trashed_at, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
              file_name = excluded.file_name,
              folder = excluded.folder,
              tags = excluded.tags,
              description = excluded.description,
              is_favorite = excluded.is_favorite,
              is_trashed = excluded.is_trashed,
              trashed_at = excluded.trashed_at,
              updated_at = CURRENT_TIMESTAMP
              WHERE vault_files.user_id = excluded.user_id`,
        args: [
          file.id,
          targetUserId,
          file.fileName,
          file.fileKey || "",
          file.fileSize || 0,
          file.mimeType || "application/pdf",
          file.folder || "General",
          JSON.stringify(file.tags || []),
          file.description || null,
          file.isFavorite ? 1 : 0,
          file.isTrashed ? 1 : 0,
          file.trashedAt || null,
          file.createdAt || new Date().toISOString(),
        ],
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Server vault files error (POST):", err);
      return res.status(500).json({ error: "Failed to save vault file" });
    }
  });

  // DELETE /api/vault/files
  app.delete("/api/vault/files", async (req, res) => {
    try {
      if (!tursoClient) {
        return res.status(503).json({ error: "Database unavailable" });
      }
      await ensureTables();

      const verifiedUserId = await authenticateUser(req);
      const id = req.query.id;
      const targetUserId = verifiedUserId || req.query.userId || req.query.user_id;

      if (!id || !targetUserId) {
        return res.status(400).json({ error: "id and authentication required" });
      }

      await tursoClient.execute({
        sql: "DELETE FROM vault_files WHERE id = ? AND user_id = ?",
        args: [String(id), String(targetUserId)],
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Server vault file delete error:", err);
      return res.status(500).json({ error: "Failed to delete vault file" });
    }
  });

  // PATCH /api/vault/files/folder (Rename folder)
  app.patch("/api/vault/files/folder", async (req, res) => {
    try {
      if (!tursoClient) {
        return res.status(503).json({ error: "Database unavailable" });
      }
      await ensureTables();

      const verifiedUserId = await authenticateUser(req);
      const { oldFolder, newFolder, userId } = req.body || {};
      const targetUserId = verifiedUserId || userId;

      if (!oldFolder || !newFolder || !targetUserId) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      await tursoClient.execute({
        sql: "UPDATE vault_files SET folder = ? WHERE user_id = ? AND folder = ?",
        args: [String(newFolder), String(targetUserId), String(oldFolder)],
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Folder rename error:", err);
      return res.status(500).json({ error: "Failed to update folder" });
    }
  });

  // DELETE /api/vault/files/folder (Delete folder files)
  app.delete("/api/vault/files/folder", async (req, res) => {
    try {
      if (!tursoClient) {
        return res.status(503).json({ error: "Database unavailable" });
      }
      await ensureTables();

      const verifiedUserId = await authenticateUser(req);
      const folder = req.query.folder;
      const targetUserId = verifiedUserId || req.query.userId;

      if (!folder || !targetUserId) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      await tursoClient.execute({
        sql: "DELETE FROM vault_files WHERE user_id = ? AND folder = ?",
        args: [String(targetUserId), String(folder)],
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Folder delete error:", err);
      return res.status(500).json({ error: "Failed to delete folder content" });
    }
  });

  // PATCH /api/vault/files/move (Move file to folder)
  app.patch("/api/vault/files/move", async (req, res) => {
    try {
      if (!tursoClient) {
        return res.status(503).json({ error: "Database unavailable" });
      }
      await ensureTables();

      const verifiedUserId = await authenticateUser(req);
      const { fileId, folder, userId } = req.body || {};
      const targetUserId = verifiedUserId || userId;

      if (!fileId || !folder || !targetUserId) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      await tursoClient.execute({
        sql: "UPDATE vault_files SET folder = ? WHERE id = ? AND user_id = ?",
        args: [String(folder), String(fileId), String(targetUserId)],
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Move file error:", err);
      return res.status(500).json({ error: "Failed to move file" });
    }
  });

  // PATCH /api/vault/files/trash (Move to trash or restore)
  app.patch("/api/vault/files/trash", async (req, res) => {
    try {
      if (!tursoClient) {
        return res.status(503).json({ error: "Database unavailable" });
      }
      await ensureTables();

      const verifiedUserId = await authenticateUser(req);
      const { fileId, isTrashed, trashedAt, userId } = req.body || {};
      const targetUserId = verifiedUserId || userId;

      if (!fileId || !targetUserId) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      await tursoClient.execute({
        sql: "UPDATE vault_files SET is_trashed = ?, trashed_at = ? WHERE id = ? AND user_id = ?",
        args: [isTrashed ? 1 : 0, trashedAt || null, String(fileId), String(targetUserId)],
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Trash update error:", err);
      return res.status(500).json({ error: "Failed to update trash state" });
    }
  });

  // DELETE /api/vault/files/empty-trash
  app.delete("/api/vault/files/empty-trash", async (req, res) => {
    try {
      if (!tursoClient) {
        return res.status(503).json({ error: "Database unavailable" });
      }
      await ensureTables();

      const verifiedUserId = await authenticateUser(req);
      const targetUserId = verifiedUserId || req.query.userId;

      if (!targetUserId) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      await tursoClient.execute({
        sql: "DELETE FROM vault_files WHERE user_id = ? AND is_trashed = 1",
        args: [String(targetUserId)],
      });

      return res.json({ success: true });
    } catch (err: any) {
      console.error("Empty trash error:", err);
      return res.status(500).json({ error: "Failed to empty trash" });
    }
  });

  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.join(distPath, "index.html"));

  // Serve compiled production build if present for 100% reliable Tailwind styling, or fallback to Vite dev middleware
  if (hasDist) {
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.url.startsWith("/api/")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving optimized application from dist.");
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();

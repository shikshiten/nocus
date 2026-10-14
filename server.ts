import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import OpenAI from "openai";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import dotenv from "dotenv";

dotenv.config();

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
  const initialModel = params.model || "gemini-flash-latest";
  
  // Define fallback models to try if the initial model fails or is overloaded
  const fallbackCandidates = [
    "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash"
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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Set limits for larger PDF payloads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Route: Check Server Health
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // API Route: Smart Syllabus Parsing via Gemini
  app.post("/api/parse-syllabus", async (req, res) => {
    try {
      const { pdfBase64, mimeType, syllabusText } = req.body;

      if (!pdfBase64 && !syllabusText) {
        return res.status(400).json({ error: "Syllabus content is required (pdfBase64 or syllabusText)." });
      }

      const ai = getAIClient();
      let contents: any[] = [];

      const prompt = `You are an expert academic curriculum assistant. Parse the provided syllabus document completely and extract ALL Units, Modules, Chapters, and Topics into a highly structured JSON format.
Analyze the ENTIRE document thoroughly across all pages. Do NOT stop after the first unit or skip any sections.
Extract every single Unit/Module/Chapter (e.g. Unit 1, Unit 2, Unit 3, Unit 4, Unit 5, etc.) and all corresponding sub-topics under each unit.
Group the topics logically under their respective Units. If there are no clear units, group them under logical sections, chapters, or modules.
Keep the unit names descriptive (e.g. "Unit 1: Digital Fundamentals"), and keep each topic short, clear, and action-oriented (maximum 10 words per topic).

Return ONLY a JSON object with this exact typescript structure:
{
  "subjectName": string, // Name of the course/subject, e.g. "Digital Electronics"
  "units": Array<{
    "name": string, // Name of the Unit, e.g. "Unit 1: Introduction to Logic Gates"
    "topics": string[] // List of distinct topics to learn in this unit
  }>
}

Ensure the response contains no markdown block characters (like \`\`\`json) and is valid, pure JSON.`;

      if (pdfBase64) {
        // Clean base64 string
        const cleanBase64 = pdfBase64.replace(/^data:[^;]+;base64,/, "");
        contents = [
          {
            inlineData: {
              mimeType: mimeType || "application/pdf",
              data: cleanBase64
            }
          },
          { text: prompt }
        ];
      } else {
        contents = [
          `Syllabus Copy-Pasted Text:\n${syllabusText}\n\n${prompt}`
        ];
      }

      console.log("Parsing syllabus using Google Gemini flash-latest...");
      const response = await generateContentWithRetry(ai, {
        model: 'gemini-flash-latest',
        contents,
        config: {
          maxOutputTokens: 8192,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subjectName: {
                type: Type.STRING,
                description: "Name of the course/subject, e.g. 'Data Structures & Algorithms'"
              },
              units: {
                type: Type.ARRAY,
                description: "List of academic units or chapters in the syllabus",
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: {
                      type: Type.STRING,
                      description: "Name of the unit, e.g. 'Unit 1: Introduction'"
                    },
                    topics: {
                      type: Type.ARRAY,
                      description: "Distinct short topic names to learn within this unit (under 10 words per topic)",
                      items: {
                        type: Type.STRING
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
        console.error("Failed to parse AI response JSON. Output was:", responseText);
        return res.status(500).json({
          error: "Unable to parse this syllabus automatically. Please ensure the document is clear, or paste the text directly."
        });
      }

      res.json(parsedData);
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
  // Cloudflare R2 Vault API Routes
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
        return res.status(503).json({ error: "R2 storage is not configured on the server." });
      }

      const { fileName, fileSize, mimeType, userId } = req.body;

      if (!fileName || !userId) {
        return res.status(400).json({ error: "fileName and userId are required." });
      }

      const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
      if (fileSize && fileSize > MAX_SIZE) {
        return res.status(400).json({ error: "File size exceeds the 5MB limit." });
      }

      // Generate a unique key: userId/timestamp_fileName
      const sanitizedName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileKey = `${userId}/${Date.now()}_${sanitizedName}`;

      const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: fileKey,
        ContentType: mimeType || "application/pdf",
        ContentLength: fileSize,
      });

      const uploadUrl = await getSignedUrl(r2Client, command, { expiresIn: 300 }); // 5 min expiry

      res.json({ uploadUrl, fileKey });
    } catch (error: any) {
      console.error("Error generating upload URL:", error);
      res.status(500).json({ error: "Failed to generate secure upload link." });
    }
  });

  // Generate presigned download URL
  app.get("/api/vault/download-url/:fileKey(*)", async (req, res) => {
    try {
      if (!r2Client) {
        return res.status(503).json({ error: "Storage service is currently unavailable." });
      }

      const { fileKey } = req.params;

      if (!fileKey) {
        return res.status(400).json({ error: "fileKey is required." });
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
      res.status(500).json({ error: "Failed to generate secure download link." });
    }
  });

  // Delete file from R2
  app.delete("/api/vault/file/:fileKey(*)", async (req, res) => {
    try {
      if (!r2Client) {
        return res.status(503).json({ error: "Storage service is currently unavailable." });
      }

      const { fileKey } = req.params;

      if (!fileKey) {
        return res.status(400).json({ error: "fileKey is required." });
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

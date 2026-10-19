import { GoogleGenAI, Type } from "@google/genai";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  OPENAI_API_KEY?: string;
  GEMINI_API_KEY?: string;
  R2_ACCOUNT_ID?: string;
  R2_ACCESS_KEY_ID?: string;
  R2_SECRET_ACCESS_KEY?: string;
  R2_BUCKET_NAME?: string;
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function getGeminiClient(env: Env): GoogleGenAI | null {
  const key = (env.GEMINI_API_KEY || (typeof process !== "undefined" ? process.env?.GEMINI_API_KEY : "") || "").trim();
  if (!key) return null;
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch {
    return null;
  }
}

async function parseSyllabusWithOpenAI(apiKey: string, text: string): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey.trim()}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are an expert academic curriculum assistant. Parse the provided syllabus document completely and extract ALL Units, Modules, Chapters, and Topics into a highly structured JSON format.
Analyze the ENTIRE document thoroughly. Extract every single Unit/Module/Chapter (e.g. Unit 1, Unit 2, Unit 3, Unit 4, Unit 5, etc.) and all corresponding sub-topics under each unit.
Keep the unit names descriptive, and keep each topic short, clear, and action-oriented (maximum 10 words per topic).

Return ONLY a JSON object with this exact structure:
{
  "subjectName": "string",
  "units": [
    {
      "name": "string",
      "topics": ["string"]
    }
  ]
}`
        },
        {
          role: "user",
          content: `Here is the syllabus text to parse:\n\n${text}`
        }
      ],
      temperature: 0.2
    })
  });

  if (!res.ok) {
    throw new Error(`OpenAI request failed with status ${res.status}`);
  }

  const json: any = await res.json();
  const raw = json.choices?.[0]?.message?.content || "{}";
  return JSON.parse(raw);
}

function extractPdfTextFromBase64(base64: string): string {
  try {
    const binary = atob(base64);
    let extracted = "";
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;
    while ((match = streamRegex.exec(binary)) !== null) {
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
    return extracted.trim();
  } catch (e) {
    return "";
  }
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    // Health check endpoint
    if (url.pathname === "/api/health") {
      return jsonResponse({ status: "ok", provider: "Cloudflare Workers" });
    }

    // Parse syllabus endpoint
    if (url.pathname === "/api/parse-syllabus" && request.method === "POST") {
      try {
        const body: any = await request.json().catch(() => ({}));
        const { pdfBase64, mimeType, syllabusText } = body;

        if (!pdfBase64 && !syllabusText) {
          return jsonResponse({ error: "Syllabus content is required." }, 400);
        }

        // Use Gemini exclusively for syllabus parsing
        const gemini = getGeminiClient(env);
        if (gemini) {
          const prompt = `You are an expert academic curriculum assistant. Parse the provided syllabus document completely and organize ALL Units, Modules, Chapters, and Topics into a highly structured JSON format.
Analyze the ENTIRE document thoroughly across all pages. Do NOT stop after the first unit or skip any sections.
Extract every single Unit/Module/Chapter (e.g. Unit 1, Unit 2, Unit 3, Unit 4, Unit 5, etc.) and all corresponding sub-topics under each unit.
Group the topics logically under their respective Units. If there are no explicit units, create logical units based on the subject's major chapters or themes.
Keep the unit names descriptive (e.g. "Unit 1: Digital Fundamentals"), and keep each topic short, clear, and action-oriented (maximum 10 words per topic).

Return ONLY a JSON object with this exact structure:
{
  "subjectName": string,
  "units": Array<{
    "name": string,
    "topics": string[]
  }>
}`;

          let contents: any[] = [];
          if (pdfBase64) {
            const rawBase64 = pdfBase64.includes(",") ? pdfBase64.split(",")[1] : pdfBase64;
            const extractedText = extractPdfTextFromBase64(rawBase64);
            if (extractedText && extractedText.length >= 30) {
              contents.push(`Syllabus Document Text:\n${extractedText}\n\n${prompt}`);
            } else {
              contents.push({
                inlineData: {
                  data: rawBase64,
                  mimeType: mimeType || "application/pdf"
                }
              });
              contents.push({ text: prompt });
            }
          } else {
            contents.push(`Syllabus Copy-Pasted Text:\n${syllabusText}\n\n${prompt}`);
          }

          const candidateModels = [
            "gemini-2.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash",
            "gemini-flash-latest",
            "gemini-flash-lite-latest"
          ];
          for (const model of candidateModels) {
            try {
              const response = await gemini.models.generateContent({
                model,
                contents,
                config: {
                  maxOutputTokens: 8192,
                  responseMimeType: "application/json"
                }
              });

              const text = response.text || "{}";
              const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
              const parsed = JSON.parse(cleaned);
              const normalized = normalizeSyllabusData(parsed, "Syllabus Course");
              if (normalized.units.length > 0) {
                return jsonResponse(normalized);
              }
            } catch (geminiErr) {
              console.error(`Worker Gemini error with model ${model}:`, geminiErr);
            }
          }
        }

        // Sanitized, secure error message with NO technical internals leaked
        return jsonResponse({
          error: "Unable to parse this syllabus automatically. Please try pasting the text directly into the text box."
        }, 500);

      } catch (err: any) {
        console.error("Worker parse error:", err);
        return jsonResponse({ 
          error: "Unable to process the document at this time. Please try copy-pasting the text instead." 
        }, 500);
      }
    }

    // Generate Quote endpoint
    if (url.pathname === "/api/generate-quote" && request.method === "POST") {
      try {
        const body: any = await request.json().catch(() => ({}));
        
        // 1. Try OpenAI if key exists
        if (env.OPENAI_API_KEY) {
          try {
            const res = await fetch("https://api.openai.com/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${env.OPENAI_API_KEY.trim()}`,
              },
              body: JSON.stringify({
                model: "gpt-4o-mini",
                response_format: { type: "json_object" },
                messages: [
                  {
                    role: "system",
                    content: `Generate an inspiring, concise study quote (under 130 characters) for time: "${body.timeOfDay || "morning"}". Output JSON: {"quote": string, "author": string}`
                  }
                ],
                temperature: 0.8
              })
            });

            if (res.ok) {
              const data: any = await res.json();
              const quoteObj = JSON.parse(data.choices?.[0]?.message?.content || "{}");
              if (quoteObj.quote && quoteObj.author) {
                return jsonResponse(quoteObj);
              }
            }
          } catch (err) {
            console.error("Worker quote OpenAI error:", err);
          }
        }

        // 2. Try Gemini
        const gemini = getGeminiClient(env);
        if (gemini) {
          try {
            const systemPrompt = `You are an expert motivational coach. Generate a concise study quote (under 130 characters) for time: "${body.timeOfDay || "morning"}". Output JSON: {"quote": string, "author": string}`;
            const response = await gemini.models.generateContent({
              model: "gemini-flash-latest",
              contents: [systemPrompt],
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    quote: { type: Type.STRING },
                    author: { type: Type.STRING }
                  },
                  required: ["quote", "author"]
                }
              }
            });
            const data = JSON.parse(response.text || "{}");
            return jsonResponse(data);
          } catch (err) {
            console.error("Worker quote Gemini error:", err);
          }
        }

        // Graceful fallback without erroring
        return jsonResponse({
          quote: "Continuous effort, not strength or intelligence, is the key to unlocking our potential.",
          author: "Winston Churchill"
        });
      } catch {
        return jsonResponse({
          quote: "The secret of getting ahead is getting started.",
          author: "Mark Twain"
        });
      }
    }

    // Generate Avatar endpoint
    if (url.pathname === "/api/generate-avatar" && request.method === "POST") {
      try {
        const { prompt } = (await request.json().catch(() => ({}))) as any;
        const gemini = getGeminiClient(env);
        if (gemini) {
          const systemPrompt = `Generate a clean vector avatar SVG for prompt: "${prompt}". Output ONLY a valid <svg viewBox="0 0 100 100">...</svg> without any markdown or formatting.`;
          const response = await gemini.models.generateContent({
            model: "gemini-flash-latest",
            contents: [systemPrompt]
          });

          let svgText = (response.text || "").replace(/```(?:xml|html|svg)?/g, "").trim();
          return jsonResponse({ svg: svgText });
        }

        // Clean SVG fallback
        const fallbackSvg = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#4F46E5"/><stop offset="100%" stop-color="#7C3AED"/></linearGradient></defs><rect width="100" height="100" rx="24" fill="url(#grad)"/><circle cx="50" cy="42" r="18" fill="#FFFFFF" fill-opacity="0.9"/><path d="M 22,86 C 22,66 34,62 50,62 C 66,62 78,66 78,86 Z" fill="#FFFFFF" fill-opacity="0.9"/></svg>`;
        return jsonResponse({ svg: fallbackSvg });
      } catch (err: any) {
        console.error("Worker avatar error:", err);
        return jsonResponse({ error: "Failed to generate avatar" }, 500);
      }
    }

    // Vault presigned upload URL
    if (url.pathname === "/api/vault/upload-url" && request.method === "POST") {
      try {
        if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
          return jsonResponse({ error: "Storage service is currently unavailable." }, 503);
        }

        const { fileName, fileSize, mimeType, folder } = (await request.json()) as any;
        const MAX_SIZE = 5 * 1024 * 1024; // 5MB limit
        if (fileSize && fileSize > MAX_SIZE) {
          return jsonResponse({ error: "File size exceeds the 5MB limit." }, 400);
        }
        const r2 = new S3Client({
          region: "auto",
          endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID,
            secretAccessKey: env.R2_SECRET_ACCESS_KEY,
          },
        });

        const fileKey = `vault/${folder || "General"}/${Date.now()}_${fileName}`;
        const command = new PutObjectCommand({
          Bucket: env.R2_BUCKET_NAME || "nocus",
          Key: fileKey,
          ContentType: mimeType || "application/pdf",
        });

        const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 600 });
        return jsonResponse({ uploadUrl, fileKey });
      } catch (err: any) {
        console.error("Worker vault upload error:", err);
        return jsonResponse({ error: "Failed to generate upload URL" }, 500);
      }
    }

    // Vault download URL
    if (url.pathname.startsWith("/api/vault/download-url/")) {
      try {
        const fileKey = decodeURIComponent(url.pathname.replace("/api/vault/download-url/", ""));
        const r2 = new S3Client({
          region: "auto",
          endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID || "",
            secretAccessKey: env.R2_SECRET_ACCESS_KEY || "",
          },
        });

        const command = new GetObjectCommand({
          Bucket: env.R2_BUCKET_NAME || "nocus",
          Key: fileKey,
          ResponseContentDisposition: "inline",
        });

        const downloadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
        return jsonResponse({ downloadUrl });
      } catch (err: any) {
        console.error("Worker vault download error:", err);
        return jsonResponse({ error: "Failed to get download URL" }, 500);
      }
    }

    // Vault delete file from R2
    if (url.pathname.startsWith("/api/vault/file/") && request.method === "DELETE") {
      try {
        const fileKey = decodeURIComponent(url.pathname.replace("/api/vault/file/", ""));
        if (!fileKey) {
          return jsonResponse({ error: "fileKey is required" }, 400);
        }

        if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
          return jsonResponse({ error: "Storage service is currently unavailable." }, 503);
        }

        const r2 = new S3Client({
          region: "auto",
          endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId: env.R2_ACCESS_KEY_ID || "",
            secretAccessKey: env.R2_SECRET_ACCESS_KEY || "",
          },
        });

        const command = new DeleteObjectCommand({
          Bucket: env.R2_BUCKET_NAME || "nocus",
          Key: fileKey,
        });

        await r2.send(command);
        return jsonResponse({ success: true });
      } catch (err: any) {
        console.error("Worker vault delete error:", err);
        return jsonResponse({ error: "Failed to delete file from storage." }, 500);
      }
    }

    // Delegate static website requests to Cloudflare Workers Static Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};

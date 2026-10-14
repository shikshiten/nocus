import { GoogleGenAI, Type } from "@google/genai";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export interface Env {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
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

function getAI(env: Env): GoogleGenAI {
  const key = (env.GEMINI_API_KEY || "").trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY environment variable is missing on Cloudflare Worker.");
  }
  return new GoogleGenAI({ apiKey: key });
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
        const body: any = await request.json();
        const { pdfBase64, mimeType, syllabusText } = body;

        if (!pdfBase64 && !syllabusText) {
          return jsonResponse({ error: "Syllabus content is required." }, 400);
        }

        const ai = getAI(env);
        const prompt = `You are an expert academic curriculum assistant. Parse the provided syllabus document completely and extract ALL Units, Modules, Chapters, and Topics into a highly structured JSON format.
Analyze the ENTIRE document thoroughly across all pages. Extract every single Unit/Module/Chapter (e.g. Unit 1, Unit 2, Unit 3, Unit 4, Unit 5, etc.) and all corresponding sub-topics under each unit.
Return ONLY a JSON object with this exact typescript structure:
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
          contents.push({
            inlineData: {
              data: rawBase64,
              mimeType: mimeType || "application/pdf"
            }
          });
          contents.push(prompt);
        } else {
          contents.push(`${prompt}\n\nHere is the syllabus text:\n${syllabusText}`);
        }

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents,
          config: {
            responseMimeType: "application/json"
          }
        });

        const text = response.text || "{}";
        const parsed = JSON.parse(text.replace(/```(?:json)?/g, "").trim());
        return jsonResponse(parsed);
      } catch (err: any) {
        return jsonResponse({ error: err.message || "Failed to parse syllabus" }, 500);
      }
    }

    // Generate Quote endpoint
    if (url.pathname === "/api/generate-quote" && request.method === "POST") {
      try {
        const body: any = await request.json().catch(() => ({}));
        const ai = getAI(env);
        const systemPrompt = `You are an expert motivational coach. Generate a concise study quote (under 130 characters) for time: "${body.timeOfDay || "morning"}". Output JSON: {"quote": string, "author": string}`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
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
      } catch (err: any) {
        return jsonResponse({
          quote: "Continuous effort, not strength or intelligence, is the key to unlocking our potential.",
          author: "Winston Churchill"
        });
      }
    }

    // Generate Avatar endpoint
    if (url.pathname === "/api/generate-avatar" && request.method === "POST") {
      try {
        const { prompt } = (await request.json()) as any;
        const ai = getAI(env);
        const systemPrompt = `Generate a clean vector avatar SVG for prompt: "${prompt}". Output ONLY a valid <svg viewBox="0 0 100 100">...</svg> without any markdown or formatting.`;

        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [systemPrompt]
        });

        let svgText = (response.text || "").replace(/```(?:xml|html|svg)?/g, "").trim();
        return jsonResponse({ svg: svgText });
      } catch (err: any) {
        return jsonResponse({ error: err.message || "Failed to generate avatar" }, 500);
      }
    }

    // Vault presigned upload URL
    if (url.pathname === "/api/vault/upload-url" && request.method === "POST") {
      try {
        if (!env.R2_ACCOUNT_ID || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) {
          return jsonResponse({ error: "R2 credentials not configured on Cloudflare Worker." }, 503);
        }

        const { fileName, mimeType, folder } = (await request.json()) as any;
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
          Bucket: env.R2_BUCKET_NAME || "nexora-vault",
          Key: fileKey,
          ContentType: mimeType || "application/pdf",
        });

        const uploadUrl = await getSignedUrl(r2, command, { expiresIn: 600 });
        return jsonResponse({ uploadUrl, fileKey });
      } catch (err: any) {
        return jsonResponse({ error: err.message || "Failed to generate upload URL" }, 500);
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
          Bucket: env.R2_BUCKET_NAME || "nexora-vault",
          Key: fileKey,
          ResponseContentDisposition: "inline",
        });

        const downloadUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });
        return jsonResponse({ downloadUrl });
      } catch (err: any) {
        return jsonResponse({ error: err.message || "Failed to get download URL" }, 500);
      }
    }

    // Delegate static website requests to Cloudflare Workers Static Assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Not Found", { status: 404 });
  },
};

import { GoogleGenAI } from "@google/genai";

function getAIClient(): GoogleGenAI {
  const key = (process.env.GEMINI_API_KEY || "").trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }
  return new GoogleGenAI({ apiKey: key });
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

export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const { pdfBase64, mimeType, syllabusText } = req.body || {};

    if (!pdfBase64 && !syllabusText) {
      return res.status(400).json({ error: "Syllabus content is required." });
    }

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
        `Syllabus Document Text:\n${syllabusText}\n\n${prompt}`
      ];
    }

    const ai = getAIClient();
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
      "gemini-flash-latest",
      "gemini-flash-lite-latest"
    ];

    let lastError: any = null;
    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
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
          return res.status(200).json(normalized);
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Vercel API Gemini error with model ${model}:`, err?.message || err);
      }
    }

    return res.status(500).json({
      error: "Unable to parse this syllabus automatically. Please try pasting the text directly into the text box."
    });
  } catch (err: any) {
    console.error("Vercel parse-syllabus error:", err);
    return res.status(500).json({
      error: "Unable to process the document at this time. Please try copy-pasting the text instead."
    });
  }
}

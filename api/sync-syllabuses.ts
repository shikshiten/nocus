import { createClient } from "@libsql/client/web";

const defaultTursoUrl = "https://nocus-shikshiten.aws-ap-south-1.turso.io";
const defaultTursoToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiJhZTI2ZTkxYy0yZWIzLTQzOTctYTFmOS1jNDhiMzg4MzYzZGMiLCJpYXQiOjE3OTIwMDMxNzUsImtpZCI6ImFId2pRZzFWQ1ZLejB6OW55MVprRDhrYUR4UkhlOG1Ca2YwTkRQQnpTZGsiLCJyaWQiOiI1ZGU0ZjYwNy1hNTIxLTQ1ODktYTU2Mi01ZDU1N2Y4MGJlZjUifQ.g-_w5JnSYEI8F4sGpd71lfruwV4mMiJiOmGScpOzt1BEeRQdeh4mbkJFINICEwYlugWV0Wn3eeXbBeXa69FQCw";

const rawUrl = (process.env.VITE_TURSO_DATABASE_URL || process.env.TURSO_DATABASE_URL || defaultTursoUrl).trim();
const tursoUrl = rawUrl.replace(/^libsql:\/\//, "https://");
const tursoAuthToken = (process.env.VITE_TURSO_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || defaultTursoToken).trim();

const client = createClient({
  url: tursoUrl,
  authToken: tursoAuthToken,
});

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  try {
    if (req.method === "GET") {
      const userId = req.query.userId || req.query.user_id;
      if (!userId) {
        return res.status(400).json({ error: "userId is required" });
      }

      const result = await client.execute({
        sql: "SELECT * FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC",
        args: [String(userId)],
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

      return res.status(200).json({ syllabuses });
    }

    if (req.method === "POST") {
      const { syllabus, userId } = req.body || {};
      if (!syllabus || !userId) {
        return res.status(400).json({ error: "syllabus and userId are required" });
      }

      await client.execute({
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
              updated_at = CURRENT_TIMESTAMP`,
        args: [
          syllabus.id,
          userId,
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

      return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      const userId = req.query.userId || req.query.user_id;
      if (!id || !userId) {
        return res.status(400).json({ error: "id and userId are required" });
      }

      await client.execute({
        sql: "DELETE FROM syllabuses WHERE id = ? AND user_id = ?",
        args: [String(id), String(userId)],
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("Turso serverless sync error:", err);
    return res.status(500).json({ error: err?.message || "Database sync failed" });
  }
}

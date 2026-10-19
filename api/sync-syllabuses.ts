import { createClient } from "@libsql/client/web";
import { createClerkClient } from "@clerk/backend";

const clerkPublishableKey = (process.env.VITE_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY || "").trim();
const clerkSecretKey = (process.env.CLERK_SECRET_KEY || "").trim();

const clerkClient = (clerkPublishableKey || clerkSecretKey)
  ? createClerkClient({
      publishableKey: clerkPublishableKey,
      secretKey: clerkSecretKey,
    })
  : null;

async function authenticateUser(req: any): Promise<string | null> {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  if (clerkClient) {
    try {
      const verified = await clerkClient.verifyToken(token);
      return verified.sub || null;
    } catch (err) {
      console.error("Clerk token verification failed in api/sync-syllabuses:", err);
      return null;
    }
  }
  return null;
}

function getTursoClient() {
  const rawUrl = (process.env.TURSO_DATABASE_URL || "").trim();
  const tursoUrl = rawUrl.replace(/^libsql:\/\//, "https://");
  const tursoAuthToken = (process.env.TURSO_AUTH_TOKEN || "").trim();

  if (!tursoUrl || !tursoAuthToken) {
    return null;
  }

  return createClient({
    url: tursoUrl,
    authToken: tursoAuthToken,
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  const client = getTursoClient();
  if (!client) {
    return res.status(503).json({ error: "Database service unavailable. Missing environment configuration." });
  }

  try {
    const verifiedUserId = await authenticateUser(req);

    if (req.method === "GET") {
      const paramUserId = req.query.userId || req.query.user_id;
      const targetUserId = verifiedUserId || paramUserId;

      if (!targetUserId) {
        return res.status(401).json({ error: "Unauthorized: userId is required" });
      }

      if (verifiedUserId && paramUserId && verifiedUserId !== paramUserId) {
        return res.status(403).json({ error: "Forbidden: Cannot access another user's syllabus" });
      }

      const result = await client.execute({
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

      return res.status(200).json({ syllabuses });
    }

    if (req.method === "POST") {
      const { syllabus, userId } = req.body || {};
      const targetUserId = verifiedUserId || userId;

      if (!syllabus || !targetUserId) {
        return res.status(400).json({ error: "syllabus and userId are required" });
      }

      if (verifiedUserId && userId && verifiedUserId !== userId) {
        return res.status(403).json({ error: "Forbidden: Cannot save syllabus for another user" });
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

      return res.status(200).json({ success: true });
    }

    if (req.method === "DELETE") {
      const id = req.query.id;
      const paramUserId = req.query.userId || req.query.user_id;
      const targetUserId = verifiedUserId || paramUserId;

      if (!id || !targetUserId) {
        return res.status(400).json({ error: "id and userId are required" });
      }

      if (verifiedUserId && paramUserId && verifiedUserId !== paramUserId) {
        return res.status(403).json({ error: "Forbidden: Cannot delete another user's syllabus" });
      }

      await client.execute({
        sql: "DELETE FROM syllabuses WHERE id = ? AND user_id = ?",
        args: [String(id), String(targetUserId)],
      });

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err: any) {
    console.error("Turso serverless sync error:", err);
    return res.status(500).json({ error: "Database sync failed" });
  }
}


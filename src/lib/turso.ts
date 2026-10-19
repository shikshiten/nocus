import { createClient } from "@libsql/client/web";
import { Syllabus, VaultFile } from "../types";

const defaultTursoUrl = "https://nocus-shikshiten.aws-ap-south-1.turso.io";
const defaultTursoToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJnaWQiOiJhZTI2ZTkxYy0yZWIzLTQzOTctYTFmOS1jNDhiMzg4MzYzZGMiLCJpYXQiOjE3OTIwMDMxNzUsImtpZCI6ImFId2pRZzFWQ1ZLejB6OW55MVprRDhrYUR4UkhlOG1Ca2YwTkRQQnpTZGsiLCJyaWQiOiI1ZGU0ZjYwNy1hNTIxLTQ1ODktYTU2Mi01ZDU1N2Y4MGJlZjUifQ.g-_w5JnSYEI8F4sGpd71lfruwV4mMiJiOmGScpOzt1BEeRQdeh4mbkJFINICEwYlugWV0Wn3eeXbBeXa69FQCw";

const rawUrl = (import.meta.env.VITE_TURSO_DATABASE_URL || defaultTursoUrl).trim();
const tursoUrl = rawUrl.replace(/^libsql:\/\//, "https://");
const tursoAuthToken = (import.meta.env.VITE_TURSO_AUTH_TOKEN || defaultTursoToken).trim();

export const isTursoConfigured = Boolean(tursoUrl && tursoAuthToken);

export const turso = isTursoConfigured
  ? createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    })
  : null;

let tablesInitialized = false;

/**
 * Initializes database tables in Turso if they do not already exist.
 */
export async function initTursoTables(): Promise<void> {
  if (!turso || tablesInitialized) return;

  try {
    await turso.execute(`
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

    await turso.execute(`
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
    tablesInitialized = true;
  } catch (err) {
    console.warn("Table initialization note:", err);
  }
}

/**
 * Syllabuses Data Operations
 */
export async function loadUserSyllabusesFromTurso(userId: string): Promise<Syllabus[]> {
  // Tier 1: Direct LibSQL client query over HTTPS
  if (turso) {
    try {
      await initTursoTables();
      const res = await turso.execute({
        sql: "SELECT * FROM syllabuses WHERE user_id = ? ORDER BY created_at DESC",
        args: [userId],
      });

      if (res.rows && res.rows.length > 0) {
        return res.rows.map((row: any) => ({
          id: String(row.id),
          userId: String(row.user_id),
          subjectName: String(row.subject_name),
          units: typeof row.units === "string" ? JSON.parse(row.units) : row.units || [],
          examDate: row.exam_date ? String(row.exam_date) : undefined,
          dailyTarget: row.daily_target ? Number(row.daily_target) : (row.weekly_target ? Number(row.weekly_target) : 4),
          streak: row.streak ? Number(row.streak) : 0,
          lastStudyDate: row.last_study_date ? String(row.last_study_date) : (row.last_active_date ? String(row.last_active_date) : undefined),
          keepNotes: typeof row.keep_notes === "string" ? JSON.parse(row.keep_notes) : row.keep_notes || [],
          plannedTopicsToday: typeof row.planned_topics_today === "string" ? JSON.parse(row.planned_topics_today) : row.planned_topics_today || [],
          createdAt: row.created_at ? String(row.created_at) : new Date().toISOString(),
        }));
      }
    } catch (directErr) {
      console.warn("Direct Turso client load failed, attempting API fallback:", directErr);
    }
  }

  // Tier 2: Resilient server API route fallback
  try {
    const apiRes = await fetch(`/api/sync-syllabuses?userId=${encodeURIComponent(userId)}`);
    if (apiRes.ok) {
      const data = await apiRes.json();
      if (Array.isArray(data.syllabuses)) {
        return data.syllabuses;
      }
    }
  } catch (apiErr) {
    console.warn("API Turso sync load fallback notice:", apiErr);
  }

  return [];
}

export async function syncSyllabusToTurso(s: Syllabus, userId: string): Promise<void> {
  let directSuccess = false;

  // Tier 1: Direct LibSQL client insert/update
  if (turso) {
    try {
      await initTursoTables();
      await turso.execute({
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
          s.id,
          userId,
          s.subjectName,
          s.examDate || null,
          s.dailyTarget || 4,
          s.streak || 0,
          s.lastStudyDate || null,
          JSON.stringify(s.units || []),
          JSON.stringify(s.keepNotes || []),
          JSON.stringify(s.plannedTopicsToday || []),
          s.createdAt || new Date().toISOString(),
        ],
      });
      directSuccess = true;
    } catch (err) {
      console.warn("Direct Turso sync failed, attempting API fallback:", err);
    }
  }

  // Tier 2: Server API route sync
  if (!directSuccess) {
    try {
      await fetch("/api/sync-syllabuses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ syllabus: s, userId }),
      });
    } catch (apiErr) {
      console.error("API sync error:", apiErr);
    }
  }
}

export async function deleteSyllabusFromTurso(id: string, userId: string): Promise<void> {
  let directSuccess = false;

  if (turso) {
    try {
      await turso.execute({
        sql: "DELETE FROM syllabuses WHERE id = ? AND user_id = ?",
        args: [id, userId],
      });
      directSuccess = true;
    } catch (err) {
      console.warn("Direct Turso delete error:", err);
    }
  }

  if (!directSuccess) {
    try {
      await fetch(`/api/sync-syllabuses?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`, {
        method: "DELETE",
      });
    } catch (apiErr) {
      console.error("API delete error:", apiErr);
    }
  }
}

/**
 * Vault Files Data Operations
 */
export async function loadVaultFilesFromTurso(userId: string): Promise<VaultFile[]> {
  if (!turso) return [];
  try {
    await initTursoTables();
    const res = await turso.execute({
      sql: "SELECT * FROM vault_files WHERE user_id = ? ORDER BY created_at DESC",
      args: [userId],
    });

    return res.rows.map((row: any) => ({
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
  } catch (err) {
    console.error("Error loading vault files from Turso:", err);
    return [];
  }
}

export async function syncVaultFileToTurso(file: VaultFile, userId: string): Promise<void> {
  if (!turso) return;
  try {
    await initTursoTables();
    await turso.execute({
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
            updated_at = CURRENT_TIMESTAMP`,
      args: [
        file.id,
        userId,
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
  } catch (err) {
    console.error("Error syncing vault file to Turso:", err);
  }
}

export async function deleteVaultFileFromTurso(id: string, userId: string): Promise<void> {
  if (!turso) return;
  try {
    await turso.execute({
      sql: "DELETE FROM vault_files WHERE id = ? AND user_id = ?",
      args: [id, userId],
    });
  } catch (err) {
    console.error("Error deleting vault file from Turso:", err);
  }
}

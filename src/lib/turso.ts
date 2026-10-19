import { Syllabus, VaultFile } from "../types";

/**
 * Token Provider to attach Clerk session token to API requests.
 */
let tokenGetter: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  tokenGetter = getter;
}

export async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (tokenGetter) {
    try {
      const token = await tokenGetter();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn("Could not retrieve Clerk session token:", e);
    }
  }
  return headers;
}

// Client-side dummy stub to maintain backwards-compatibility
export const turso = null;
export const isTursoConfigured = true;
export async function initTursoTables(): Promise<void> {
  // Handled on server side securely
}

/**
 * Syllabuses Data Operations (via Secure Backend API)
 */
export async function loadUserSyllabusesFromTurso(userId: string): Promise<Syllabus[]> {
  try {
    const headers = await getAuthHeaders();
    const apiRes = await fetch(`/api/sync-syllabuses?userId=${encodeURIComponent(userId)}`, {
      method: "GET",
      headers,
    });
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
  try {
    const headers = await getAuthHeaders();
    await fetch("/api/sync-syllabuses", {
      method: "POST",
      headers,
      body: JSON.stringify({ syllabus: s, userId }),
    });
  } catch (apiErr) {
    console.error("API sync error:", apiErr);
  }
}

export async function deleteSyllabusFromTurso(id: string, userId: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch(`/api/sync-syllabuses?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers,
    });
  } catch (apiErr) {
    console.error("API delete error:", apiErr);
  }
}

/**
 * Vault Files Data Operations (via Secure Backend API)
 */
export async function loadVaultFilesFromTurso(userId: string): Promise<VaultFile[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`/api/vault/files?userId=${encodeURIComponent(userId)}`, {
      method: "GET",
      headers,
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.files)) {
        return data.files;
      }
    }
  } catch (err) {
    console.warn("Error loading vault files:", err);
  }
  return [];
}

export async function syncVaultFileToTurso(file: VaultFile, userId: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch("/api/vault/files", {
      method: "POST",
      headers,
      body: JSON.stringify({ file, userId }),
    });
  } catch (err) {
    console.error("Error syncing vault file:", err);
  }
}

export async function deleteVaultFileFromTurso(id: string, userId: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch(`/api/vault/files?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers,
    });
  } catch (err) {
    console.error("Error deleting vault file:", err);
  }
}

export async function updateVaultFileFolder(oldFolder: string, newFolder: string, userId: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch("/api/vault/files/folder", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ oldFolder, newFolder, userId }),
    });
  } catch (err) {
    console.error("Error updating vault folder:", err);
  }
}

export async function deleteVaultFolderFiles(folder: string, userId: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch(`/api/vault/files/folder?folder=${encodeURIComponent(folder)}&userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers,
    });
  } catch (err) {
    console.error("Error deleting vault folder files:", err);
  }
}

export async function moveVaultFileToFolder(fileId: string, folder: string, userId: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch("/api/vault/files/move", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fileId, folder, userId }),
    });
  } catch (err) {
    console.error("Error moving vault file:", err);
  }
}

export async function setVaultFileTrash(fileId: string, isTrashed: boolean, userId: string, trashedAt?: string | null): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch("/api/vault/files/trash", {
      method: "PATCH",
      headers,
      body: JSON.stringify({ fileId, isTrashed, trashedAt, userId }),
    });
  } catch (err) {
    console.error("Error updating vault file trash state:", err);
  }
}

export async function emptyVaultTrash(userId: string): Promise<void> {
  try {
    const headers = await getAuthHeaders();
    await fetch(`/api/vault/files/empty-trash?userId=${encodeURIComponent(userId)}`, {
      method: "DELETE",
      headers,
    });
  } catch (err) {
    console.error("Error emptying vault trash:", err);
  }
}

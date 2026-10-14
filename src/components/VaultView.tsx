import React, { useState, useEffect, useRef } from "react";
import { 
  turso, 
  loadVaultFilesFromTurso, 
  syncVaultFileToTurso, 
  deleteVaultFileFromTurso 
} from "../lib/turso";
import { 
  Upload, 
  Trash2, 
  Download, 
  Eye,
  Search, 
  Plus, 
  Folder, 
  FolderOpen, 
  FileText, 
  Tag, 
  AlertCircle, 
  X, 
  Check, 
  Loader2, 
  Lock, 
  Cloud, 
  BookOpen, 
  GraduationCap, 
  ClipboardList, 
  Trophy, 
  BarChart3,
  ExternalLink,
  ChevronRight,
  Info,
  Pencil,
  FolderPlus,
  FolderInput,
  HardDrive,
  Star,
  LayoutGrid,
  List,
  Clock,
  ChevronDown,
  ChevronUp,
  Zap,
  MoreVertical,
  RotateCcw
} from "lucide-react";
import { VaultFile, FOLDER_THEMES, MAX_VAULT_FILES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from "../types";
import { motion, AnimatePresence } from "motion/react";

export interface FolderItem {
  id: string;
  name: string;
  isCore?: boolean;
}

const DEFAULT_FOLDERS: FolderItem[] = [
  { id: "folder-btech", name: "B.Tech", isCore: true },
  { id: "folder-sem5", name: "Semester 5" },
  { id: "folder-os", name: "Operating System" },
  { id: "folder-java", name: "Java" },
  { id: "folder-python", name: "Python" },
  { id: "folder-ds", name: "Data Structures" },
  { id: "folder-general", name: "General" },
  { id: "folder-lectures", name: "Lectures" },
];

interface VaultViewProps {
  user: any;
}

export default function VaultView({ user }: VaultViewProps) {
  const [files, setFiles] = useState<VaultFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFolder, setActiveFolder] = useState<string>("All");
  const [selectedTag, setSelectedTag] = useState<string>("All");
  const [activeSubTab, setActiveSubTab] = useState<"all" | "recent" | "favorites" | "trash">("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "name" | "size">("newest");
  const [showMoreFolders, setShowMoreFolders] = useState(false);

  // Favorites state persisted in localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem("meridian_vault_favorites");
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem("meridian_vault_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (fileId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites((prev) => 
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileFolder, setFileFolder] = useState<string>("General");
  const [fileTags, setFileTags] = useState<string>("");
  const [fileDescription, setFileDescription] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!successMsg) return;
    const timer = setTimeout(() => {
      setSuccessMsg(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [successMsg]);

  useEffect(() => {
    if (!errorMsg) return;
    const timer = setTimeout(() => {
      setErrorMsg(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [errorMsg]);
  
  // Dynamic Folder State
  const [folders, setFolders] = useState<FolderItem[]>(() => {
    const saved = localStorage.getItem("meridian_vault_folders");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback to default
      }
    }
    return DEFAULT_FOLDERS;
  });

  // Folder Editing State
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("meridian_vault_folders", JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    if (editingFolderId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingFolderId]);

  const [folderToDelete, setFolderToDelete] = useState<FolderItem | null>(null);
  const [movingFileId, setMovingFileId] = useState<string | null>(null);
  const [draggedFileId, setDraggedFileId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);

  const handleStartEdit = (folder: FolderItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingFolderId(folder.id);
    setEditName(folder.name);
    setEditError(null);
  };

  const handleCancelRename = () => {
    setEditingFolderId(null);
    setEditName("");
    setEditError(null);
  };

  const handleSaveRename = async (folderId: string) => {
    const trimmed = editName.trim();
    const targetFolder = folders.find((f) => f.id === folderId);
    if (!targetFolder) return;

    if (!trimmed) {
      setEditError("Folder name cannot be empty.");
      return;
    }

    const isDuplicate = folders.some(
      (f) => f.id !== folderId && f.name.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setEditError("A folder with this name already exists.");
      return;
    }

    const oldName = targetFolder.name;
    if (oldName === trimmed) {
      handleCancelRename();
      return;
    }

    const updatedFolders = folders.map((f) =>
      f.id === folderId ? { ...f, name: trimmed } : f
    );
    setFolders(updatedFolders);

    const updatedFiles = files.map((file) =>
      file.folder === oldName ? { ...file, folder: trimmed } : file
    );
    setFiles(updatedFiles);

    if (!user) {
      localStorage.setItem("meridian_vault_files", JSON.stringify(updatedFiles));
    } else {
      try {
        if (turso) {
          await turso.execute({
            sql: "UPDATE vault_files SET folder = ? WHERE user_id = ? AND folder = ?",
            args: [trimmed, user.id, oldName],
          });
        }
      } catch (err) {
        console.error("Error updating folder in database:", err);
      }
    }

    if (activeFolder === oldName) {
      setActiveFolder(trimmed);
    }

    handleCancelRename();
    setSuccessMsg(`Renamed folder to "${trimmed}".`);
  };

  const handleAddFolder = () => {
    const defaultNewName = `New Folder ${folders.length + 1}`;
    const newFolder: FolderItem = {
      id: "folder_" + Date.now(),
      name: defaultNewName,
    };
    setFolders([...folders, newFolder]);
    setEditingFolderId(newFolder.id);
    setEditName(defaultNewName);
  };

  const handleInitiateDeleteFolder = (folder: FolderItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFolderToDelete(folder);
  };

  const handleConfirmDeleteFolder = async () => {
    if (!folderToDelete) return;
    const targetName = folderToDelete.name;

    const remainingFolders = folders.filter((f) => f.id !== folderToDelete.id);
    setFolders(remainingFolders);

    const filesInFolder = files.filter((f) => f.folder === targetName);
    const updatedFiles = files.filter((f) => f.folder !== targetName);
    setFiles(updatedFiles);

    if (!user) {
      localStorage.setItem("meridian_vault_files", JSON.stringify(updatedFiles));
    } else {
      try {
        if (filesInFolder.length > 0 && turso) {
          await turso.execute({
            sql: "DELETE FROM vault_files WHERE user_id = ? AND folder = ?",
            args: [user.id, targetName],
          });
        }
      } catch (err) {
        console.error("Error deleting folder files from DB:", err);
      }
    }

    if (activeFolder === targetName) {
      setActiveFolder("All");
    }

    setSuccessMsg(`Folder "${targetName}" and its content deleted.`);
    setFolderToDelete(null);
  };

  const handleMoveFile = async (file: VaultFile, targetFolderName: string) => {
    if (file.folder === targetFolderName) return;

    const updatedFiles = files.map((f) =>
      f.id === file.id ? { ...f, folder: targetFolderName } : f
    );
    setFiles(updatedFiles);

    if (!user) {
      localStorage.setItem("meridian_vault_files", JSON.stringify(updatedFiles));
    } else {
      try {
        if (turso) {
          await turso.execute({
            sql: "UPDATE vault_files SET folder = ? WHERE id = ?",
            args: [targetFolderName, file.id],
          });
        }
      } catch (err) {
        console.error("Error moving file in database:", err);
      }
    }

    setSuccessMsg(`Moved "${file.fileName}" to folder "${targetFolderName}".`);
    setMovingFileId(null);
  };

  const handleDropFileOnFolder = async (fileId: string, targetFolderName: string) => {
    const targetFile = files.find((f) => f.id === fileId);
    if (!targetFile) return;
    await handleMoveFile(targetFile, targetFolderName);
  };
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [previewFile, setPreviewFile] = useState<VaultFile | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getUserId = () => {
    if (user) return user.id;
    let localGuestId = localStorage.getItem("meridian_guest_uuid");
    if (!localGuestId) {
      localGuestId = "guest_" + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem("meridian_guest_uuid", localGuestId);
    }
    return localGuestId;
  };

  useEffect(() => {
    fetchFiles();
  }, [user]);

  // Requirement 5: 7-Day Auto-Purge Functionality for Trash
  const autoPurgeTrash = async (fileList: VaultFile[]): Promise<VaultFile[]> => {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const expiredFiles = fileList.filter((f) => {
      if (!f.isTrashed || !f.trashedAt) return false;
      return now - new Date(f.trashedAt).getTime() > SEVEN_DAYS_MS;
    });

    if (expiredFiles.length === 0) return fileList;

    for (const expired of expiredFiles) {
      try {
        await fetch(`/api/vault/file/${encodeURIComponent(expired.fileKey)}`, { method: "DELETE" }).catch(() => {});
        if (user) {
          await deleteVaultFileFromTurso(expired.id, user.id);
        }
      } catch (err) {
        console.error("Error auto-purging expired file:", err);
      }
    }

    const activeList = fileList.filter((f) => !expiredFiles.some((exp) => exp.id === f.id));
    if (!user) {
      localStorage.setItem("meridian_vault_files", JSON.stringify(activeList));
    }

    setSuccessMsg(`Auto-purged ${expiredFiles.length} item(s) from Trash older than 7 days.`);
    return activeList;
  };

  const fetchFiles = async () => {
    setLoading(true);
    try {
      if (user) {
        const mapped = await loadVaultFilesFromTurso(user.id);
        const purged = await autoPurgeTrash(mapped);
        setFiles(purged);
      } else {
        const saved = localStorage.getItem("meridian_vault_files");
        const list: VaultFile[] = saved ? JSON.parse(saved) : [];
        const purged = await autoPurgeTrash(list);
        setFiles(purged);
      }
    } catch (err: any) {
      console.error("Error fetching files:", err);
      setErrorMsg(err.message || "Failed to load files from vault.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPreview = async (file: VaultFile) => {
    setPreviewFile(file);
    setPreviewLoading(true);
    setPreviewUrl(null);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/vault/download-url/${encodeURIComponent(file.fileKey)}`);
      if (!res.ok) throw new Error("Could not retrieve file preview link.");
      
      const { downloadUrl } = await res.json();
      setPreviewUrl(downloadUrl);
    } catch (err: any) {
      console.error("Preview error:", err);
      setErrorMsg("Failed to open file preview.");
      setPreviewFile(null);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (filesList && filesList[0]) {
      const file = filesList[0];
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setErrorMsg("Only PDF files are supported in the Vault.");
        setSelectedFile(null);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMsg(`File exceeds the ${MAX_FILE_SIZE_MB}MB size limit.`);
        setSelectedFile(null);
        return;
      }
      setSelectedFile(file);
      setErrorMsg(null);
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const activeCount = files.filter((f) => !f.isTrashed).length;
    if (activeCount >= MAX_VAULT_FILES) {
      setErrorMsg(`You have reached the maximum vault limit of ${MAX_VAULT_FILES} PDFs.`);
      return;
    }

    setUploading(true);
    setUploadProgress(10);
    setErrorMsg(null);

    try {
      const activeUserId = getUserId();
      let fileKey = "";

      // Attempt Cloud storage upload if API is available
      try {
        const urlRes = await fetch("/api/vault/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileName: selectedFile.name,
            fileSize: selectedFile.size,
            mimeType: selectedFile.type,
            userId: activeUserId,
          }),
        });

        if (urlRes.ok) {
          const data = await urlRes.json();
          const uploadUrl = data.uploadUrl;
          fileKey = data.fileKey;

          setUploadProgress(30);
          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": selectedFile.type || "application/pdf",
            },
            body: selectedFile,
          });

          if (uploadRes.ok) {
            setUploadProgress(70);
          } else {
            fileKey = "";
          }
        }
      } catch (cloudErr) {
        console.warn("Cloud R2 upload unavailable, saving vault file locally:", cloudErr);
        fileKey = "";
      }

      // Generate local key fallback if cloud storage is unconfigured or failed
      const sanitizedName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      if (!fileKey) {
        fileKey = `local_${Date.now()}_${sanitizedName}`;
      }

      const tagsArray = fileTags
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);

      const newFileObj: VaultFile = {
        id: "file_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9),
        userId: activeUserId,
        fileName: selectedFile.name,
        fileKey: fileKey,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || "application/pdf",
        folder: fileFolder,
        tags: tagsArray,
        description: fileDescription || undefined,
        isTrashed: false,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (user) {
        try {
          await syncVaultFileToTurso(newFile, user.id);
        } catch (e) {
          console.error("Error saving file to Turso:", e);
        }
      }

      const saved = localStorage.getItem("meridian_vault_files");
      const list = saved ? JSON.parse(saved) : [];
      const updatedList = [newFileObj, ...list.filter((f: any) => f.id !== newFileObj.id)];
      localStorage.setItem("meridian_vault_files", JSON.stringify(updatedList));

      setUploadProgress(100);
      setSuccessMsg("PDF uploaded to Vault successfully!");
      
      setSelectedFile(null);
      setFileTags("");
      setFileDescription("");
      setFileFolder(folders[0]?.name || "General");
      setShowUploadModal(false);
      
      await fetchFiles();
    } catch (err: any) {
      console.error("Upload error:", err);
      setErrorMsg(err.message || "Failed to upload file.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = async (file: VaultFile) => {
    setDownloadingId(file.id);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/vault/download-url/${encodeURIComponent(file.fileKey)}`);
      if (!res.ok) throw new Error("Could not retrieve download link.");
      
      const { downloadUrl } = await res.json();
      
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", file.fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error("Download error:", err);
      setErrorMsg("Failed to download file from storage.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Requirement 2: Soft Delete Logic (Move to Trash)
  const handleMoveToTrash = async (file: VaultFile) => {
    const now = new Date().toISOString();
    const updatedFiles = files.map((f) =>
      f.id === file.id ? { ...f, isTrashed: true, trashedAt: now } : f
    );
    setFiles(updatedFiles);

    if (!user) {
      localStorage.setItem("meridian_vault_files", JSON.stringify(updatedFiles));
    } else {
      try {
        if (turso) {
          await turso.execute({
            sql: "UPDATE vault_files SET is_trashed = 1, trashed_at = ? WHERE id = ?",
            args: [now, file.id],
          });
        }
      } catch (err) {
        console.error("Error moving file to trash in DB:", err);
      }
    }

    setSuccessMsg(`Moved "${file.fileName}" to Trash. Auto-deletes after 7 days.`);
  };

  // Requirement 4a: Restore from Trash
  const handleRestoreFromTrash = async (file: VaultFile) => {
    const updatedFiles = files.map((f) =>
      f.id === file.id ? { ...f, isTrashed: false, trashedAt: null } : f
    );
    setFiles(updatedFiles);

    if (!user) {
      localStorage.setItem("meridian_vault_files", JSON.stringify(updatedFiles));
    } else {
      try {
        if (turso) {
          await turso.execute({
            sql: "UPDATE vault_files SET is_trashed = 0, trashed_at = NULL WHERE id = ?",
            args: [file.id],
          });
        }
      } catch (err) {
        console.error("Error restoring file from trash in DB:", err);
      }
    }

    setSuccessMsg(`Restored "${file.fileName}" from Trash.`);
  };

  // Requirement 4b: Delete Permanently
  const handleDeletePermanently = async (file: VaultFile) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${file.fileName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(file.id);
    setErrorMsg(null);
    try {
      const deleteRes = await fetch(`/api/vault/file/${encodeURIComponent(file.fileKey)}`, {
        method: "DELETE",
      });

      if (!deleteRes.ok) {
        console.warn("Storage deletion warning: R2 file could not be removed directly.");
      }

      if (user) {
        await deleteVaultFileFromTurso(file.id, user.id);
      } else {
        const saved = localStorage.getItem("meridian_vault_files");
        const list = saved ? JSON.parse(saved) : [];
        const updatedList = list.filter((f: any) => f.id !== file.id);
        localStorage.setItem("meridian_vault_files", JSON.stringify(updatedList));
      }

      setSuccessMsg(`Permanently deleted "${file.fileName}".`);
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (err: any) {
      console.error("Delete error:", err);
      setErrorMsg(err.message || "Failed to delete file.");
    } finally {
      setDeletingId(null);
    }
  };

  // Empty Trash Action
  const handleEmptyTrash = async () => {
    const trashedFiles = files.filter((f) => f.isTrashed);
    if (trashedFiles.length === 0) return;

    if (!window.confirm(`Permanently delete all ${trashedFiles.length} file(s) in Trash? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      for (const file of trashedFiles) {
        await fetch(`/api/vault/file/${encodeURIComponent(file.fileKey)}`, { method: "DELETE" }).catch(() => {});
      }

      if (user && turso) {
        await turso.execute({
          sql: "DELETE FROM vault_files WHERE user_id = ? AND is_trashed = 1",
          args: [user.id],
        });
      } else {
        const remaining = files.filter((f) => !f.isTrashed);
        localStorage.setItem("meridian_vault_files", JSON.stringify(remaining));
      }

      setFiles((prev) => prev.filter((f) => !f.isTrashed));
      setSuccessMsg("Trash emptied successfully.");
    } catch (err: any) {
      console.error("Empty trash error:", err);
      setErrorMsg("Failed to empty trash.");
    } finally {
      setLoading(false);
    }
  };

  const allTags = Array.from(
    new Set(files.filter(f => !f.isTrashed).flatMap((f) => f.tags))
  );

  // Requirement 3: Views & Filtering
  const filteredFiles = files.filter((file) => {
    const matchesSearch = 
      file.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (file.description && file.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      file.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = selectedTag === "All" || file.tags.includes(selectedTag);

    if (activeSubTab === "trash") {
      return file.isTrashed === true && matchesSearch && matchesTag;
    }

    // Main non-trashed views
    if (file.isTrashed) return false;

    const matchesFolder = activeFolder === "All" || file.folder === activeFolder;

    let matchesSubTab = true;
    if (activeSubTab === "recent") {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      matchesSubTab = new Date(file.createdAt) >= sevenDaysAgo;
    } else if (activeSubTab === "favorites") {
      matchesSubTab = favorites.includes(file.id);
    }

    return matchesSearch && matchesFolder && matchesTag && matchesSubTab;
  }).sort((a, b) => {
    if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    if (sortBy === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    if (sortBy === "name") return a.fileName.localeCompare(b.fileName);
    if (sortBy === "size") return b.fileSize - a.fileSize;
    return 0;
  });

  const activeFiles = files.filter((f) => !f.isTrashed);
  const trashedFiles = files.filter((f) => f.isTrashed);
  const totalStorageBytes = activeFiles.reduce((acc, f) => acc + f.fileSize, 0);
  const usedPercent = Math.min(100, Math.round((activeFiles.length / MAX_VAULT_FILES) * 100));

  const visibleFolders = showMoreFolders ? folders : folders.slice(0, 6);

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-[1600px] mx-auto font-sans text-body-app">
      {/* Toast Notifications */}
      <AnimatePresence>
        {errorMsg && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-300 rounded-xl text-xs flex items-center gap-2.5"
          >
            <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0" />
            <span className="font-semibold">{errorMsg}</span>
            <button onClick={() => setErrorMsg(null)} className="ml-auto text-rose-400 hover:text-rose-600">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
        {successMsg && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300 rounded-xl text-xs flex items-center gap-2.5"
          >
            <Check className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
            <span className="font-semibold">{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Row (2 Distinct Sleek Cards matching reference design) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        
        {/* Header Left Card: Title, Subtitle & Upload Action */}
        <div className="lg:col-span-8 bg-surface-app border border-hairline-app rounded-2xl px-5 py-3 sm:px-6 sm:py-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/15 flex items-center justify-center shrink-0 shadow-xs">
              <FileText className="w-5 h-5 stroke-1.75" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-ink-app font-serif leading-tight truncate">
                {activeSubTab === "trash" ? "PDF Trash Bin" : "PDF Library"}
              </h2>
              <p className="text-xs text-muted-soft-app font-medium mt-0.5 truncate">
                {activeSubTab === "trash" ? "Items in trash are auto-deleted after 7 days" : "Manage your study notes and documents"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {activeSubTab === "trash" && trashedFiles.length > 0 && (
              <button
                onClick={handleEmptyTrash}
                className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-xs rounded-xl border border-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Empty Trash</span>
              </button>
            )}

            <button
              onClick={() => setShowUploadModal(true)}
              disabled={activeFiles.length >= MAX_VAULT_FILES}
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 active:scale-98 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Upload PDF</span>
            </button>
          </div>
        </div>

        {/* Header Right Card: Storage Usage & Capacity Bar */}
        <div className="lg:col-span-4 bg-surface-app border border-hairline-app rounded-2xl px-5 py-3 sm:px-6 sm:py-3.5 shadow-xs flex flex-col justify-center gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-bold text-muted-soft-app uppercase tracking-wider font-mono">
              Storage Used
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-sm font-black text-ink-app font-sans">
                {activeFiles.length} / {MAX_VAULT_FILES}
              </span>
              <span className="text-[10px] font-bold text-muted-soft-app">PDFs</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-hairline-soft-app">
              <div 
                className="h-full bg-gradient-to-r from-violet-600 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${usedPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-extrabold text-muted-app font-mono shrink-0">
              {usedPercent}%
            </span>
          </div>
        </div>

      </div>

      {!user && (
        <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs rounded-2xl flex items-center gap-2 font-medium">
          <span>💡</span>
          <span><strong>Guest Mode:</strong> Your files are uploaded to Cloudflare R2, but saved locally in this browser. Sign in to sync across devices.</span>
        </div>
      )}

      {/* Main Workspace Area: Left Navigation Sub-Sidebar + Right File Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Sub-Sidebar (Width ~3 columns) */}
        <div className="lg:col-span-3 space-y-5">
          
          {/* 1. Quick Filters Card (All Files, Recent, Favorites, Trash) */}
          <div className="bg-surface-app border border-hairline-app rounded-2xl p-2.5 shadow-xs space-y-1">
            <button
              onClick={() => {
                setActiveSubTab("all");
                setActiveFolder("All");
                setSelectedTag("All");
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === "all" && activeFolder === "All"
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/15"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 opacity-75" />
                <span>All Files</span>
              </div>
              <span className="text-[10px] font-mono font-bold bg-card-app px-2 py-0.5 rounded-full border border-hairline-soft-app">
                {activeFiles.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab("recent")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === "recent"
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/15"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 opacity-75" />
                <span>Recent</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-muted-soft-app">
                {activeFiles.filter(f => new Date(f.createdAt) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
              </span>
            </button>

            <button
              onClick={() => setActiveSubTab("favorites")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === "favorites"
                  ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/15"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="w-4 h-4 opacity-75 text-amber-500 fill-amber-500/20" />
                <span>Favorites</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-muted-soft-app">
                {activeFiles.filter(f => favorites.includes(f.id)).length}
              </span>
            </button>

            {/* Requirement 3: Sidebar Trash Menu Option */}
            <button
              onClick={() => setActiveSubTab("trash")}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === "trash"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/15"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-4 h-4 opacity-75 text-rose-500" />
                <span>Trash</span>
              </div>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                trashedFiles.length > 0 ? "bg-rose-500/15 text-rose-600 dark:text-rose-400 font-extrabold" : "text-muted-soft-app"
              }`}>
                {trashedFiles.length}
              </span>
            </button>
          </div>

          {/* 2. Folders List Section */}
          <div className="bg-surface-app border border-hairline-app rounded-2xl p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-hairline-soft-app pb-2">
              <span className="text-[10px] font-extrabold text-muted-soft-app uppercase tracking-widest font-mono">
                Folders
              </span>
              <button
                type="button"
                onClick={handleAddFolder}
                className="flex items-center gap-1 text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Folder</span>
              </button>
            </div>

            <div className="space-y-1">
              {visibleFolders.map((folder) => {
                const folderName = folder.name;
                const isActive = activeFolder === folderName && activeSubTab !== "trash";
                const folderCount = activeFiles.filter((f) => f.folder === folderName).length;
                const isEditing = editingFolderId === folder.id;

                if (isEditing) {
                  return (
                    <div key={folder.id} className="p-1">
                      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-xl border border-violet-500/50">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            if (editError) setEditError(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveRename(folder.id);
                            if (e.key === "Escape") handleCancelRename();
                          }}
                          className="w-full bg-transparent text-xs font-bold text-ink-app focus:outline-hidden px-1"
                        />
                        <button onClick={() => handleSaveRename(folder.id)} className="p-1 text-emerald-500">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={handleCancelRename} className="p-1 text-slate-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div 
                    key={folder.id} 
                    className="group flex items-center justify-between"
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (dragOverFolderId !== folder.id) setDragOverFolderId(folder.id);
                    }}
                    onDragLeave={() => setDragOverFolderId(null)}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fileId = e.dataTransfer.getData("text/plain");
                      if (fileId) handleDropFileOnFolder(fileId, folder.name);
                      setDragOverFolderId(null);
                    }}
                  >
                    <button
                      onClick={() => {
                        setActiveFolder(folderName);
                        setActiveSubTab("all");
                      }}
                      onDoubleClick={(e) => handleStartEdit(folder, e)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        dragOverFolderId === folder.id
                          ? "bg-violet-500/20 ring-2 ring-violet-500 text-violet-600"
                          : isActive
                          ? "bg-violet-500/10 text-violet-600 dark:text-violet-400 font-extrabold"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Folder className="w-4 h-4 text-violet-500 shrink-0" />
                        <span className="truncate max-w-[130px]" title={folderName}>{folderName}</span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <span className="text-[10px] font-mono text-muted-soft-app group-hover:hidden">
                          {folderCount}
                        </span>
                        <div className="hidden group-hover:flex items-center gap-0.5">
                          <button
                            onClick={(e) => handleStartEdit(folder, e)}
                            className="p-1 text-slate-400 hover:text-violet-600"
                            title="Rename"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleInitiateDeleteFolder(folder, e)}
                            className="p-1 text-slate-400 hover:text-rose-500"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>

            {folders.length > 6 && (
              <button
                onClick={() => setShowMoreFolders(!showMoreFolders)}
                className="w-full text-left px-3 py-1.5 text-[11px] font-bold text-muted-soft-app hover:text-ink-app transition-colors flex items-center gap-1.5 cursor-pointer pt-1 border-t border-hairline-soft-app"
              >
                {showMoreFolders ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Show less</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Show more ({folders.length - 6})</span>
                  </>
                )}
              </button>
            )}
          </div>

        </div>

        {/* Right Main Content Section (Width ~9 columns) */}
        <div className="lg:col-span-9 space-y-5">
          
          {/* Filter & Toolbar Row (Search Bar + Sort + View Mode Switcher) */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-app border border-hairline-app p-2.5 rounded-2xl shadow-xs">
            
            {/* Search Input Box */}
            <div className="relative flex-1 min-w-0">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search files by name, tags, or description..."
                className="w-full pl-10 pr-8 py-2 bg-transparent text-xs font-semibold text-ink-app placeholder-slate-400 focus:outline-hidden"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")} 
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort & View Mode Controls */}
            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
              
              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 text-xs text-muted-soft-app font-medium bg-card-app px-3 py-1.5 rounded-xl border border-hairline-soft-app">
                <span className="text-[11px]">Sort by</span>
                <select
                  value={sortBy}
                  onChange={(e: any) => setSortBy(e.target.value)}
                  className="bg-transparent font-bold text-ink-app focus:outline-hidden cursor-pointer text-xs"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name</option>
                  <option value="size">Size</option>
                </select>
              </div>

              {/* View Mode Switcher */}
              <div className="bg-card-app p-1 rounded-xl border border-hairline-soft-app flex items-center gap-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "grid"
                      ? "bg-violet-600 text-white shadow-xs"
                      : "text-muted-soft-app hover:text-ink-app"
                  }`}
                  title="Grid View"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    viewMode === "list"
                      ? "bg-violet-600 text-white shadow-xs"
                      : "text-muted-soft-app hover:text-ink-app"
                  }`}
                  title="List View"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>

            </div>

          </div>

          {/* Files Rendering Section */}
          {loading ? (
            <div className="py-24 text-center space-y-3 bg-surface-app border border-hairline-app rounded-2xl">
              <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
              <p className="text-xs text-muted-soft-app font-bold uppercase tracking-wider font-mono">
                Loading PDF vault...
              </p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="bg-surface-app border border-hairline-app rounded-2xl p-12 text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 text-violet-600 flex items-center justify-center mx-auto border border-violet-500/15">
                {activeSubTab === "trash" ? <Trash2 className="w-6 h-6 stroke-1.5 text-rose-500" /> : <FileText className="w-6 h-6 stroke-1.5" />}
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-ink-app">
                  {activeSubTab === "trash" ? "Trash Bin is Empty" : "No PDF documents found"}
                </h4>
                <p className="text-xs text-muted-app max-w-sm mx-auto">
                  {activeSubTab === "trash"
                    ? "Deleted items will be safely stored here for 7 days before being automatically purged."
                    : activeFiles.length === 0
                    ? "Your library is empty. Upload your first PDF to get started!"
                    : "No files match your search query or selected folder filter."}
                </p>
              </div>
              {activeFiles.length === 0 && activeSubTab !== "trash" && (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl cursor-pointer inline-flex items-center gap-1.5 shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload First PDF</span>
                </button>
              )}
            </div>
          ) : viewMode === "grid" ? (
            /* 4-Column PDF Grid View */
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredFiles.map((file) => {
                const isFav = favorites.includes(file.id);
                const isDeleting = deletingId === file.id;
                const isDownloading = downloadingId === file.id;

                return (
                  <div
                    key={file.id}
                    draggable={!file.isTrashed}
                    onDragStart={(e) => {
                      if (!file.isTrashed) {
                        e.dataTransfer.setData("text/plain", file.id);
                        setDraggedFileId(file.id);
                      }
                    }}
                    onDragEnd={() => setDraggedFileId(null)}
                    className={`bg-surface-app border border-hairline-app rounded-2xl p-4 flex flex-col justify-between space-y-3.5 hover:border-violet-500/30 hover:shadow-md transition-all group ${
                      draggedFileId === file.id ? "opacity-40 border-dashed border-violet-500" : ""
                    } ${file.isTrashed ? "border-rose-500/20 bg-rose-500/[0.02]" : ""}`}
                  >
                    {/* Top Row: PDF Badge Icon + Star Favorite Toggle */}
                    <div className="flex items-start justify-between">
                      <div className={`w-10 h-10 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                        file.isTrashed
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/15"
                      }`}>
                        <FileText className="w-4 h-4 stroke-1.75" />
                        <span className="text-[8px] font-black uppercase tracking-tighter leading-none mt-0.5">
                          PDF
                        </span>
                      </div>

                      {!file.isTrashed && (
                        <button
                          onClick={(e) => toggleFavorite(file.id, e)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            isFav
                              ? "text-amber-500 bg-amber-500/10"
                              : "text-slate-300 dark:text-slate-600 hover:text-amber-500"
                          }`}
                          title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Star className={`w-4 h-4 ${isFav ? "fill-amber-500" : ""}`} />
                        </button>
                      )}
                    </div>

                    {/* File Title & Folder Metadata */}
                    <div className="space-y-1.5 min-w-0">
                      <h4 
                        onClick={() => handleOpenPreview(file)}
                        className="text-xs font-bold text-ink-app line-clamp-1 truncate hover:text-violet-600 cursor-pointer transition-colors"
                        title={file.fileName}
                      >
                        {file.fileName}
                      </h4>

                      <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-soft-app">
                        <Folder className="w-3 h-3 text-violet-500 shrink-0" />
                        <span className="truncate">{file.folder}</span>
                      </div>

                      <p className="text-[10px] text-slate-400 font-mono">
                        {formatBytes(file.fileSize)} • {new Date(file.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>

                      {file.isTrashed && file.trashedAt && (
                        <p className="text-[9px] font-bold text-rose-500 font-mono">
                          Trashed {new Date(file.trashedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Requirement 4: Trash Bin Action Buttons */}
                    <div className="grid grid-cols-3 gap-1.5 pt-2.5 border-t border-hairline-soft-app">
                      <button
                        onClick={() => handleOpenPreview(file)}
                        disabled={isDownloading || isDeleting}
                        className="p-1.5 rounded-lg bg-card-app hover:bg-violet-500/10 hover:text-violet-600 border border-hairline-soft-app text-slate-500 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                        title="Preview PDF"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>

                      {file.isTrashed ? (
                        <>
                          {/* Requirement 4a: Restore Button */}
                          <button
                            onClick={() => handleRestoreFromTrash(file)}
                            className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center justify-center transition-colors cursor-pointer"
                            title="Restore file"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Requirement 4b: Delete Permanently Button */}
                          <button
                            onClick={() => handleDeletePermanently(file)}
                            disabled={isDeleting}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 border border-rose-500/20 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                            title="Delete Permanently"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleDownload(file)}
                            disabled={isDownloading || isDeleting}
                            className="p-1.5 rounded-lg bg-card-app hover:bg-violet-500/10 hover:text-violet-600 border border-hairline-soft-app text-slate-500 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                            title="Download PDF"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>

                          {/* Requirement 2: Soft Delete Button */}
                          <button
                            onClick={() => handleMoveToTrash(file)}
                            disabled={isDownloading || isDeleting}
                            className="p-1.5 rounded-lg bg-card-app hover:bg-rose-500/10 hover:text-rose-500 border border-hairline-soft-app text-slate-500 flex items-center justify-center transition-colors cursor-pointer disabled:opacity-50"
                            title="Move to Trash"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            /* List View (Matching Reference Design) */
            <div className="space-y-3">
              {filteredFiles.map((file) => {
                const isFav = favorites.includes(file.id);
                const isDeleting = deletingId === file.id;
                const isDownloading = downloadingId === file.id;

                return (
                  <div
                    key={file.id}
                    className={`bg-surface-app border border-hairline-app rounded-2xl sm:rounded-3xl p-3.5 sm:p-4 flex flex-row items-center justify-between gap-4 shadow-2xs hover:border-violet-500/30 hover:shadow-md transition-all group ${
                      file.isTrashed ? "border-rose-500/20 bg-rose-500/[0.02]" : ""
                    }`}
                  >
                    {/* Left Section: File Icon + File Info Stack */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* PDF File Badge Icon */}
                      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                        file.isTrashed
                          ? "bg-rose-500/10 text-rose-500 border-rose-500/20"
                          : "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/15"
                      }`}>
                        <FileText className="w-5 h-5 stroke-1.75" />
                      </div>

                      {/* File Name & Metadata Stack */}
                      <div className="min-w-0 flex-1 space-y-1">
                        <h4 
                          onClick={() => handleOpenPreview(file)}
                          className="text-xs sm:text-sm font-bold text-ink-app truncate hover:text-violet-600 cursor-pointer transition-colors"
                          title={file.fileName}
                        >
                          {file.fileName}
                        </h4>

                        {/* Inline Metadata Row: Folder Tag, File Size, Date */}
                        <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted-soft-app whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 font-sans font-semibold text-xs shrink-0 border border-violet-500/15">
                            <Folder className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                            <span className="truncate max-w-[120px]">{file.folder}</span>
                          </span>

                          <span className="text-slate-300 dark:text-slate-700 shrink-0">•</span>
                          <span className="shrink-0 font-sans">{formatBytes(file.fileSize)}</span>
                          <span className="text-slate-300 dark:text-slate-700 shrink-0">•</span>
                          <span className="shrink-0 font-sans">
                            {new Date(file.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </span>

                          {file.tags && file.tags.length > 0 && file.tags.map((tag) => (
                            <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-sans font-medium shrink-0">
                              <Tag className="w-3 h-3" />
                              {tag}
                            </span>
                          ))}

                          {file.isTrashed && file.trashedAt && (
                            <span className="text-xs font-bold text-rose-500 font-mono shrink-0">
                              Trashed {new Date(file.trashedAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Section: Action Icon Buttons */}
                    <div className="flex items-center gap-2 shrink-0">
                      {!file.isTrashed && (
                        <button
                          onClick={(e) => toggleFavorite(file.id, e)}
                          className={`w-9.5 h-9.5 rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                            isFav
                              ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                              : "bg-surface-app border border-hairline-app text-slate-400 hover:text-amber-500 hover:border-amber-500/30"
                          }`}
                          title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                        >
                          <Star className={`w-4.5 h-4.5 ${isFav ? "fill-amber-500 text-amber-500" : ""}`} />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenPreview(file)}
                        disabled={isDownloading || isDeleting}
                        className="w-9.5 h-9.5 rounded-2xl bg-surface-app border border-hairline-app hover:border-violet-500/30 hover:bg-violet-500/10 text-slate-500 dark:text-slate-400 hover:text-violet-600 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 shrink-0"
                        title="Preview PDF"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {file.isTrashed ? (
                        <>
                          <button
                            onClick={() => handleRestoreFromTrash(file)}
                            className="w-9.5 h-9.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 flex items-center justify-center transition-all cursor-pointer shrink-0"
                            title="Restore file"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePermanently(file)}
                            disabled={isDeleting}
                            className="w-9.5 h-9.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 shrink-0"
                            title="Delete Permanently"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleDownload(file)}
                            disabled={isDownloading || isDeleting}
                            className="w-9.5 h-9.5 rounded-2xl bg-surface-app border border-hairline-app hover:border-violet-500/30 hover:bg-violet-500/10 text-slate-500 dark:text-slate-400 hover:text-violet-600 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 shrink-0"
                            title="Download PDF"
                          >
                            {isDownloading ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            onClick={() => handleMoveToTrash(file)}
                            disabled={isDownloading || isDeleting}
                            className="w-9.5 h-9.5 rounded-2xl bg-surface-app border border-hairline-app hover:border-rose-500/30 hover:bg-rose-500/10 text-slate-500 dark:text-slate-400 hover:text-rose-500 flex items-center justify-center transition-all cursor-pointer disabled:opacity-50 shrink-0"
                            title="Move to Trash"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer Pagination Bar */}
          {filteredFiles.length > 0 && (
            <div className="flex items-center justify-end gap-3 pt-2 text-xs text-muted-soft-app">
              <div className="flex items-center gap-1.5">
                <button disabled className="px-2.5 py-1 rounded-lg border border-hairline-soft-app text-slate-300 opacity-50 cursor-not-allowed">
                  &lt;
                </button>
                <button className="px-3 py-1 rounded-lg bg-violet-600 text-white font-bold text-xs shadow-xs">
                  1
                </button>
                <button disabled className="px-2.5 py-1 rounded-lg border border-hairline-soft-app text-slate-300 opacity-50 cursor-not-allowed">
                  &gt;
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Upload PDF Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/[0.08] rounded-[28px] shadow-2xl overflow-hidden w-full max-w-lg relative"
            >
              <div className="h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
              
              <div className="p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-150 dark:border-slate-800/40 pb-3">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white font-serif">
                    Upload PDF to Cloud Vault
                  </h3>
                  <button onClick={() => setShowUploadModal(false)} className="p-1 text-slate-400 hover:text-slate-650 cursor-pointer">
                    <X className="w-4.5 h-4.5" />
                  </button>
                </div>

                <form onSubmit={handleUploadSubmit} className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 text-center hover:border-violet-500 transition-colors cursor-pointer space-y-2 bg-slate-50/50 dark:bg-slate-900/20"
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileChange} 
                      accept=".pdf" 
                      className="hidden" 
                    />
                    <Upload className="w-8 h-8 text-slate-400 mx-auto" />
                    {selectedFile ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 break-all">
                          {selectedFile.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono">
                          {formatBytes(selectedFile.size)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-slate-800 dark:text-slate-200 text-xs">
                          Click to select a PDF file
                        </p>
                        <p className="text-[10px] text-slate-400 font-normal">
                          Only PDF files supported, max size {MAX_FILE_SIZE_MB}MB
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400">
                      Folder / Category
                    </label>
                    <select
                      value={fileFolder}
                      onChange={(e) => setFileFolder(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-violet-500 text-xs"
                    >
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.name}>{folder.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400">
                      Search Tags (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={fileTags}
                      onChange={(e) => setFileTags(e.target.value)}
                      placeholder="e.g. midterm, lectures, math"
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-violet-500 text-xs placeholder-slate-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wider text-slate-400">
                      Short Description / Notes
                    </label>
                    <textarea
                      value={fileDescription}
                      onChange={(e) => setFileDescription(e.target.value)}
                      placeholder="Add brief details about what this PDF contains..."
                      rows={3}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-hidden focus:border-violet-500 text-xs placeholder-slate-400 resize-none font-medium leading-relaxed"
                    />
                  </div>

                  {uploading && (
                    <div className="space-y-1.5 pt-2">
                      <div className="flex justify-between text-[10px] font-mono text-slate-400">
                        <span>Uploading directly to Cloudflare R2...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-850 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-3 border-t border-slate-150 dark:border-slate-800/40">
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => setShowUploadModal(false)}
                      className="px-4 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-colors cursor-pointer text-slate-600 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!selectedFile || uploading}
                      className="px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50 font-bold"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4.5 h-4.5 animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <span>Upload File</span>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PDF Preview Modal */}
      <AnimatePresence>
        {previewFile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/[0.08] rounded-[28px] shadow-2xl overflow-hidden w-full max-w-5xl h-[85vh] flex flex-col relative"
            >
              <div className="h-1 bg-gradient-to-r from-violet-500 to-indigo-500 shrink-0" />
              
              <div className="px-6 py-4 border-b border-slate-150 dark:border-slate-800/40 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/10 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 rounded-xl shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-white font-serif truncate">
                      {previewFile.fileName}
                    </h3>
                    <p className="text-[10px] text-slate-400 dark:text-slate-550 font-mono mt-0.5">
                      {previewFile.folder} • {formatBytes(previewFile.fileSize)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(previewFile)}
                    className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-655 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                    title="Download PDF"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setPreviewFile(null);
                      setPreviewUrl(null);
                    }}
                    className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-655 hover:text-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-center"
                    title="Close Viewer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative overflow-hidden">
                {previewLoading ? (
                  <div className="text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-violet-600 mx-auto" />
                    <p className="text-xs text-muted-soft-app font-bold uppercase tracking-wider font-mono">
                      Generating secure preview...
                    </p>
                  </div>
                ) : previewUrl ? (
                  <iframe
                    src={`${previewUrl}#toolbar=1`}
                    className="w-full h-full border-none"
                    title={previewFile.fileName}
                  />
                ) : (
                  <div className="text-center space-y-2 text-slate-400">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                    <p className="text-xs font-bold">Failed to load PDF preview.</p>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Folder Modal */}
      <AnimatePresence>
        {folderToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-surface-app border border-hairline-app p-6 rounded-[24px] shadow-2xl max-w-md w-full space-y-4 font-sans text-ink-app"
            >
              <div className="flex items-center gap-3 text-rose-500">
                <div className="p-2.5 bg-rose-500/10 rounded-2xl">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-ink-app">Delete Folder</h3>
                  <p className="text-xs text-muted-soft-app font-medium">This action cannot be undone.</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Are you sure you want to delete folder <strong className="text-ink-app font-bold">"{folderToDelete.name}"</strong>
                {files.filter((f) => f.folder === folderToDelete.name).length > 0 ? (
                  <span className="text-rose-500 font-semibold"> and ALL {files.filter((f) => f.folder === folderToDelete.name).length} file(s) inside</span>
                ) : null}?
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-hairline-soft-app">
                <button
                  type="button"
                  onClick={() => setFolderToDelete(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteFolder}
                  className="px-4 py-2 text-xs font-bold bg-rose-500 hover:bg-rose-600 text-white rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Delete Folder
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

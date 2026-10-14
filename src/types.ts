export interface Topic {
  id: string;
  name: string;
  completed: boolean;
  completedAt?: string; // ISO String
  notes?: string;
  bookmarked?: boolean;
  targetDate?: string; // YYYY-MM-DD
}

export interface Unit {
  id: string;
  name: string;
  topics: Topic[];
  bookmarked?: boolean;
}

export interface Syllabus {
  id: string;
  userId: string;
  subjectName: string;
  units: Unit[];
  createdAt: string;
  examDate?: string; // YYYY-MM-DD
  dailyTarget: number; // e.g. 4
  streak: number;
  lastStudyDate?: string; // YYYY-MM-DD
  keepNotes?: KeepNote[];
  plannedTopicsToday?: string[]; // list of planned Topic IDs for today's session
}

export interface KeepNote {
  id: string;
  title: string;
  content: string;
  color?: string; // e.g., 'slate', 'rose', 'amber', 'emerald', 'teal', 'sky', 'violet', 'fuchsia', 'default'
  isPinned?: boolean;
  createdAt: string;
}

export interface DailyGoalStatus {
  target: number;
  completedTodayCount: number;
  completedTodayTopicNames: string[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string; // ISO String
  read: boolean;
  type: "info" | "success" | "warning";
}

export interface ImageUpload {
  id: string;
  name: string;
  base64: string;
  mimeType: string;
}

export interface PreviewTopic {
  name: string;
  isLowConfidence?: boolean;
  confidenceReason?: string;
}

export interface PreviewUnit {
  name: string;
  topics: PreviewTopic[];
}

export interface PreviewSyllabusData {
  subjectName: string;
  units: PreviewUnit[];
}

export interface SyllabusUploadState {
  loading: boolean;
  error: string | null;
  mode: "file" | "text" | "image";
  syllabusText: string;
  images: ImageUpload[];
  previewSyllabus: PreviewSyllabusData | null;
}

// ========================================
// PDF Vault Types (Cloudflare R2 Storage)
// ========================================

export interface VaultFile {
  id: string;
  userId: string;
  fileName: string;
  fileKey: string;
  fileSize: number;
  mimeType: string;
  folder: string;
  tags: string[];
  description?: string;
  isTrashed?: boolean;
  trashedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type VaultFolder = string;

// Category icons and colors for folders
export interface FolderTheme {
  icon: string; // lucide icon name
  color: string; // tailwind color key
  bgLight: string;
  bgDark: string;
  textColor: string;
}

export const FOLDER_THEMES: Record<string, FolderTheme> = {
  "General": {
    icon: "FolderOpen",
    color: "slate",
    bgLight: "bg-slate-100",
    bgDark: "dark:bg-slate-900/30",
    textColor: "text-slate-600 dark:text-slate-400",
  },
  "Lectures": {
    icon: "GraduationCap",
    color: "violet",
    bgLight: "bg-violet-100",
    bgDark: "dark:bg-violet-950/30",
    textColor: "text-violet-600 dark:text-violet-400",
  },
  "Assignments": {
    icon: "ClipboardList",
    color: "amber",
    bgLight: "bg-amber-100",
    bgDark: "dark:bg-amber-950/30",
    textColor: "text-amber-600 dark:text-amber-400",
  },
  "Notes": {
    icon: "FileText",
    color: "emerald",
    bgLight: "bg-emerald-100",
    bgDark: "dark:bg-emerald-950/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
  },
  "Research": {
    icon: "Search",
    color: "sky",
    bgLight: "bg-sky-100",
    bgDark: "dark:bg-sky-950/30",
    textColor: "text-sky-600 dark:text-sky-400",
  },
  "Exams": {
    icon: "Trophy",
    color: "rose",
    bgLight: "bg-rose-100",
    bgDark: "dark:bg-rose-950/30",
    textColor: "text-rose-600 dark:text-rose-400",
  },
  "Textbooks": {
    icon: "BookOpen",
    color: "indigo",
    bgLight: "bg-indigo-100",
    bgDark: "dark:bg-indigo-950/30",
    textColor: "text-indigo-600 dark:text-indigo-400",
  },
  "Reports": {
    icon: "BarChart3",
    color: "teal",
    bgLight: "bg-teal-100",
    bgDark: "dark:bg-teal-950/30",
    textColor: "text-teal-600 dark:text-teal-400",
  },
};

export const MAX_VAULT_FILES = 7;
export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

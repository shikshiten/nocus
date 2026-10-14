import React, { useState, useEffect } from "react";
import { useUser, useClerk } from "@clerk/react";
import { 
  turso, 
  loadUserSyllabusesFromTurso, 
  syncSyllabusToTurso, 
  deleteSyllabusFromTurso, 
  initTursoTables 
} from "./lib/turso";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  LogOut,
  Moon,
  Sun,
  RotateCcw,
  CheckCircle2,
  User,
  GraduationCap,
  Calendar,
  CloudLightning,
  Trash2,
  Plus,
  AlertCircle,
  FileText,
  ListTodo,
  Settings,
  Timer,
  LayoutDashboard,
  Star,
  HelpCircle,
  Bookmark,
  Menu,
  Bell,
  X,
  ChevronRight,
  ChevronDown,
  Flame,
  LineChart,
  Lock,
  Activity,
  History,
  Clock,
  LogIn,
  Camera,
  Upload,
  Sparkles,
  RefreshCw,
  Palette,
  Check,
  Loader2,
  FolderArchive
} from "lucide-react";

import { Syllabus, Unit, Topic, KeepNote, AppNotification, SyllabusUploadState, ImageUpload, PreviewSyllabusData } from "./types";
import SyllabusUpload from "./components/SyllabusUpload";
import ProgressStats from "./components/ProgressStats";
import SyllabusChecklist from "./components/SyllabusChecklist";
import ProgressCharts from "./components/ProgressCharts";
import KeepNotes from "./components/KeepNotes";
import AccountSettings from "./components/AccountSettings";
import AuthView from "./components/AuthView";

// New modular view components
import DashboardView from "./components/DashboardView";
import StudyCalendar from "./components/StudyCalendar";
import BookmarksView from "./components/BookmarksView";
import HelpSupportView from "./components/HelpSupportView";
import VaultView from "./components/VaultView";

export default function App() {
  const { user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const clerk = useClerk();
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [guestMode, setGuestMode] = useState<boolean>(() => {
    return localStorage.getItem("meridian_guest_mode") === "true" || localStorage.getItem("nocus_guest_mode") === "true";
  });

  useEffect(() => {
    // Release loading screen after 1.2s max if Clerk is still connecting/blocked
    const timer = setTimeout(() => {
      setAuthTimedOut(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const authLoading = !clerkLoaded && !authTimedOut && !guestMode;

  const user = clerkUser
    ? {
        ...clerkUser,
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        user_metadata: {
          full_name: clerkUser.fullName || clerkUser.firstName || "",
          avatar_url: clerkUser.imageUrl || "",
        },
      }
    : null;
  const [syllabuses, setSyllabuses] = useState<Syllabus[]>([]);
  const [currentSyllabus, setCurrentSyllabus] = useState<Syllabus | null>(null);
  const [isAddingCourse, setIsAddingCourse] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Standalone notes state when no syllabus is active
  const [standaloneNotes, setStandaloneNotes] = useState<KeepNote[]>(() => {
    try {
      const saved = localStorage.getItem("standaloneNotes");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Mobile sidebar drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [headerDropdownOpen, setHeaderDropdownOpen] = useState(false);

  // Unified navigation view state
  const [activeSidebarTab, setActiveSidebarTab] = useState<
    | "dashboard"
    | "checklist"
    | "notes"
    | "analytics"
    | "calendar"
    | "bookmarks"
    | "vault"
    | "settings"
    | "help"
  >("dashboard");

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText: string;
    type: "danger" | "warning";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
    confirmText: "Confirm",
    type: "warning",
  });

  // State to hold authentication errors
  const [authError, setAuthError] = useState<string | null>(null);

  // Global Syllabus Upload/Parsing State to persist across component unmounts
  const [uploadState, setUploadState] = useState<SyllabusUploadState>({
    loading: false,
    error: null,
    mode: "file",
    syllabusText: "",
    images: [],
    previewSyllabus: null,
  });

  const parseSyllabusLocally = (text: string, defaultSubjectName?: string): PreviewSyllabusData => {
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    let subjectName = defaultSubjectName || "New Subject";

    const units: { name: string; topics: { name: string; isLowConfidence: boolean }[] }[] = [];
    let currentUnit: { name: string; topics: { name: string; isLowConfidence: boolean }[] } | null = null;

    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith("subject:") || lower.startsWith("course:") || lower.startsWith("title:")) {
        const extracted = line.replace(/^(subject|course|title):\s*/i, "").trim();
        if (extracted) subjectName = extracted;
        continue;
      }

      const isUnitHeader = /^(unit|module|chapter|section|part)\s+\d+[:\-\s]?/i.test(line) ||
        /^unit\b/i.test(line) ||
        /^chapter\b/i.test(line) ||
        /^module\b/i.test(line);

      if (isUnitHeader) {
        currentUnit = {
          name: line,
          topics: []
        };
        units.push(currentUnit);
        continue;
      }

      if (!currentUnit) {
        currentUnit = {
          name: "Unit 1: Introduction & Fundamentals",
          topics: []
        };
        units.push(currentUnit);
      }

      const cleanTopic = line.replace(/^[\s\-\*\•\d+\.]+\s*/, "").trim();
      if (cleanTopic.length > 2 && cleanTopic.length < 150) {
        currentUnit.topics.push({
          name: cleanTopic.substring(0, 80),
          isLowConfidence: false
        });
      }
    }

    if (units.length === 0 || units.every(u => u.topics.length === 0)) {
      const fallbackTopics = lines
        .map(l => l.replace(/^[\s\-\*\•\d+\.]+\s*/, "").trim())
        .filter(l => l.length > 2 && l.length < 150)
        .slice(0, 15)
        .map(t => ({ name: t.substring(0, 80), isLowConfidence: false }));

      units.length = 0;
      units.push({
        name: "Unit 1: Subject Topics",
        topics: fallbackTopics.length > 0 ? fallbackTopics : [
          { name: "Overview and Objectives", isLowConfidence: false },
          { name: "Core Concepts & Fundamentals", isLowConfidence: false },
          { name: "Practical Applications", isLowConfidence: false }
        ]
      });
    }

    return { subjectName, units };
  };

  const handleProcessFile = async (file: File) => {
    if (!file) return;
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPDF) {
      setUploadState(prev => ({ ...prev, error: "Please upload a PDF file only." }));
      return;
    }

    setUploadState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string;
          let parsed: any = null;

          try {
            const res = await fetch("/api/parse-syllabus", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                pdfBase64: base64,
                mimeType: file.type || "application/pdf",
              }),
            });

            if (res.ok) {
              parsed = await res.json();
            } else {
              const errJson = await res.json().catch(() => ({}));
              throw new Error(errJson.error || `Failed to parse syllabus PDF (Server Error ${res.status}).`);
            }
          } catch (apiErr: any) {
            console.error("API syllabus parse error:", apiErr);
            throw apiErr;
          }

          if (!parsed || !parsed.subjectName || !parsed.units || !Array.isArray(parsed.units) || parsed.units.length === 0) {
            throw new Error("Could not extract syllabus structure from the PDF file.");
          }

          const mapped: PreviewSyllabusData = {
            subjectName: parsed.subjectName || file.name,
            units: (parsed.units || []).map((u: any) => ({
              name: u.name,
              topics: (u.topics || []).map((t: any) => ({
                name: typeof t === "string" ? t : t.name || "Topic",
                isLowConfidence: false
              }))
            }))
          };

          setUploadState(prev => ({ ...prev, previewSyllabus: mapped, loading: false }));
          addNotification(
            "Syllabus Parsed 📚",
            `Syllabus for "${mapped.subjectName}" has been created! Verify and import now.`,
            "success"
          );
        } catch (err: any) {
          setUploadState(prev => ({ ...prev, error: err.message || "Something went wrong while processing the file.", loading: false }));
        }
      };
      reader.onerror = () => {
        setUploadState(prev => ({ ...prev, error: "Failed to read file.", loading: false }));
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadState(prev => ({ ...prev, error: err.message || "Failed to process file.", loading: false }));
    }
  };

  const handleProcessText = async (textVal: string) => {
    if (!textVal.trim()) {
      setUploadState(prev => ({ ...prev, error: "Please paste your syllabus text first." }));
      return;
    }

    setUploadState(prev => ({ ...prev, loading: true, error: null }));

    try {
      let parsed: any = null;

      try {
        const res = await fetch("/api/parse-syllabus", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            syllabusText: textVal.trim(),
          }),
        });

        if (res.ok) {
          parsed = await res.json();
        }
      } catch (apiErr) {
        console.warn("API text syllabus parse unavailable, using client-side fallback parser:", apiErr);
      }

      if (!parsed || !parsed.subjectName || !parsed.units) {
        parsed = parseSyllabusLocally(textVal.trim());
      }

      const mapped: PreviewSyllabusData = {
        subjectName: parsed.subjectName,
        units: (parsed.units || []).map((u: any) => ({
          name: u.name,
          topics: (u.topics || []).map((t: any) => ({
            name: typeof t === "string" ? t : t.name || "Topic",
            isLowConfidence: false
          }))
        }))
      };

      setUploadState(prev => ({ ...prev, previewSyllabus: mapped, loading: false }));
      addNotification(
        "Syllabus Parsed 📚",
        `Syllabus for "${mapped.subjectName}" has been parsed successfully! Verify and import now.`,
        "success"
      );
    } catch (err: any) {
      setUploadState(prev => ({ ...prev, error: err.message || "Failed to process text syllabus.", loading: false }));
    }
  };

  const handleScanImages = async (imagesList: ImageUpload[]) => {
    if (imagesList.length === 0) {
      setUploadState(prev => ({ ...prev, error: "Please select or drop at least one syllabus image first." }));
      return;
    }

    setUploadState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const res = await fetch("/api/scan-syllabus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          images: imagesList.map((img) => ({
            base64: img.base64,
            mimeType: img.mimeType,
          })),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to scan syllabus images.");
      }

      const parsed = await res.json();
      if (!parsed.subjectName || !parsed.units) {
        throw new Error("Invalid syllabus structure returned from scanning.");
      }

      const mapped: PreviewSyllabusData = {
        subjectName: parsed.subjectName,
        units: parsed.units.map((u: any) => ({
          name: u.name || "Unnamed Unit",
          topics: (u.topics || []).map((t: any) => ({
            name: typeof t === "string" ? t : t.name || "",
            isLowConfidence: typeof t === "object" ? !!t.isLowConfidence : false,
            confidenceReason: typeof t === "object" ? t.confidenceReason : undefined
          }))
        }))
      };

      setUploadState(prev => ({ ...prev, previewSyllabus: mapped, loading: false }));
      addNotification(
        "Syllabus Scanned 📸",
        `Syllabus for "${parsed.subjectName}" has been scanned successfully! Verify and import now.`,
        "success"
      );
    } catch (err: any) {
      setUploadState(prev => ({ ...prev, error: err.message || "Failed to scan images with Gemini OCR.", loading: false }));
    }
  };

  // Active workspace tab ("checklist", "keep", or "pomodoro")
  const [activeTab, setActiveTab] = useState<"checklist" | "keep" | "pomodoro">("checklist");

  // Notifications State
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem("appNotifications");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Deduplicate and fix any potential duplicates on load
          const seen = new Set<string>();
          return parsed.filter((n) => {
            if (!n.id || seen.has(n.id)) {
              return false;
            }
            seen.add(n.id);
            return true;
          });
        }
      } catch (e) {
        console.error("Failed to parse notifications", e);
      }
    }
    return [
      {
        id: "notif_welcome",
        title: "Welcome to Syllabus Tracker! 🎉",
        message: "Ready to ace your exams? Create a customized syllabus, track units, take notes, and manage your schedule in one elegant study hub.",
        timestamp: new Date().toISOString(),
        read: false,
        type: "success",
      },
      {
        id: "notif_tip",
        title: "Study Tip: Spaced Repetition",
        message: "Research shows reviewing topics at increasing intervals maximizes retention. Bookmark key topics to review them daily!",
        timestamp: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
        read: false,
        type: "info",
      },
    ];
  });

  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [activityDropdownOpen, setActivityDropdownOpen] = useState(false);
  const notificationsRef = React.useRef<HTMLDivElement>(null);
  const activityDropdownRef = React.useRef<HTMLDivElement>(null);
  const headerDropdownRef = React.useRef<HTMLDivElement>(null);

  // Splash & Welcome Tour States
  const [showSplash, setShowSplash] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(1);

  useEffect(() => {
    const hasSeen = localStorage.getItem("hasSeenTour");
    if (hasSeen !== "true") {
      setShowSplash(true);
      const timer = setTimeout(() => {
        setShowSplash(false);
        setShowTour(true);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleCompleteTour = () => {
    localStorage.setItem("hasSeenTour", "true");
    setShowTour(false);
  };

  // Save notifications to localStorage
  useEffect(() => {
    localStorage.setItem("appNotifications", JSON.stringify(notifications));
  }, [notifications]);

  // Close active dropdowns on scroll (outside dropdowns) and outside tap or click
  useEffect(() => {
    function handleEvent(event: Event) {
      const target = event.target as Node;
      if (!target) return;

      const clickedInsideNotifications = notificationsRef.current?.contains(target);
      const clickedInsideHeaderDropdown = headerDropdownRef.current?.contains(target);
      const clickedInsideActivityDropdown = activityDropdownRef.current?.contains(target);

      if (event.type === "scroll") {
        // If scrolling inside one of the dropdown menus, do not dismiss them
        if (clickedInsideNotifications || clickedInsideHeaderDropdown || clickedInsideActivityDropdown) {
          return;
        }
        setNotificationsOpen(false);
        setHeaderDropdownOpen(false);
        setActivityDropdownOpen(false);
        return;
      }

      // Handle mousedown and touchstart
      if (!clickedInsideNotifications) {
        setNotificationsOpen(false);
      }
      if (!clickedInsideHeaderDropdown) {
        setHeaderDropdownOpen(false);
      }
      if (!clickedInsideActivityDropdown) {
        setActivityDropdownOpen(false);
      }
    }

    const anyOpen = notificationsOpen || headerDropdownOpen || activityDropdownOpen;

    if (anyOpen) {
      window.addEventListener("scroll", handleEvent, { capture: true });
      document.addEventListener("mousedown", handleEvent, { capture: true });
      document.addEventListener("touchstart", handleEvent, { capture: true });
    }

    return () => {
      window.removeEventListener("scroll", handleEvent, { capture: true });
      document.removeEventListener("mousedown", handleEvent, { capture: true });
      document.removeEventListener("touchstart", handleEvent, { capture: true });
    };
  }, [notificationsOpen, headerDropdownOpen, activityDropdownOpen]);

  // Helper to add a notification dynamically
  const addNotification = (title: string, message: string, type: "info" | "success" | "warning" = "info") => {
    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const newNotif: AppNotification = {
      id: `notif_${Date.now()}_${randomSuffix}`,
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
      type,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const clearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // Dark mode state
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem("darkMode");
    if (saved) return saved === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  // Apply dark mode CSS class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  const toggleDarkMode = () => {
    document.documentElement.classList.add("disable-transitions");
    const newDarkMode = !darkMode;
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", String(newDarkMode));

    // Force a browser reflow to apply the theme instantly
    void document.documentElement.offsetHeight;

    // Re-enable transitions on next animation frame
    requestAnimationFrame(() => {
      document.documentElement.classList.remove("disable-transitions");
    });

    setDarkMode(newDarkMode);
  };

  // Keep compatibility with legacy currentView state
  const currentView = activeSidebarTab === "settings" ? "settings" : "dashboard";
  const setCurrentView = (view: "dashboard" | "settings") => {
    setActiveSidebarTab(view === "settings" ? "settings" : "dashboard");
  };

  // Custom App Preferences
  const [guestName, setGuestName] = useState(() => {
    return localStorage.getItem("guestName") || "Syllabus Explorer";
  });
  const [weeklyTarget, setWeeklyTarget] = useState(() => {
    const saved = localStorage.getItem("weeklyTarget");
    return saved ? Number(saved) : 5;
  });
  const [primaryColor, setPrimaryColor] = useState<string>(() => {
    return localStorage.getItem("primaryColor") || "indigo";
  });
  const [customAvatar, setCustomAvatar] = useState(() => {
    return localStorage.getItem("customAvatar") || "";
  });
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);

  const handleUpdateGuestName = (name: string) => {
    setGuestName(name);
    localStorage.setItem("guestName", name);
  };

  const handleUpdateCustomAvatar = (avatar: string) => {
    setCustomAvatar(avatar);
    localStorage.setItem("customAvatar", avatar);
  };

  // Theme Style state ("default" vs "terracotta" [#D5360C bg, #101010 element, #E6D5BD text])
  const [themeStyle, setThemeStyle] = useState<"default" | "terracotta">(() => {
    return (localStorage.getItem("themeStyle") as "default" | "terracotta") || "default";
  });

  const getThemeConfig = (color: string) => {
    switch (color) {
      case "violet":
        return {
          bg: "bg-violet-600 dark:bg-violet-500",
          bgHover: "hover:bg-violet-700 dark:hover:bg-violet-600",
          text: "text-violet-600 dark:text-violet-400",
          border: "border-violet-100 dark:border-violet-950/50",
          borderPrimary: "border-violet-500",
          gradient: "from-violet-600 to-fuchsia-600",
          gradientBg: "bg-violet-50/40 dark:bg-[#110e20]/20",
          badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
          ring: "ring-violet-500/20",
          shadow: "shadow-violet-500/15",
          accentBg: "bg-violet-600 text-white shadow-xs",
          textMuted: "text-violet-500 dark:text-violet-400",
          hex: "#8b5cf6",
        };
      case "emerald":
        return {
          bg: "bg-emerald-600 dark:bg-emerald-500",
          bgHover: "hover:bg-emerald-700 dark:hover:bg-emerald-600",
          text: "text-emerald-600 dark:text-emerald-400",
          border: "border-emerald-100 dark:border-emerald-950/50",
          borderPrimary: "border-emerald-500",
          gradient: "from-emerald-500 to-teal-600",
          gradientBg: "bg-emerald-50/40 dark:bg-[#0c1a12]/20",
          badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
          ring: "ring-emerald-500/20",
          shadow: "shadow-emerald-500/15",
          accentBg: "bg-emerald-600 text-white shadow-xs",
          textMuted: "text-emerald-500 dark:text-emerald-400",
          hex: "#10b981",
        };
      case "rose":
        return {
          bg: "bg-rose-600 dark:bg-rose-500",
          bgHover: "hover:bg-rose-700 dark:hover:bg-rose-600",
          text: "text-rose-600 dark:text-rose-400",
          border: "border-rose-100 dark:border-rose-950/50",
          borderPrimary: "border-rose-500",
          gradient: "from-rose-500 to-pink-600",
          gradientBg: "bg-rose-50/40 dark:bg-[#1f0e12]/20",
          badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
          ring: "ring-rose-500/20",
          shadow: "shadow-rose-500/15",
          accentBg: "bg-rose-600 text-white shadow-xs",
          textMuted: "text-rose-500 dark:text-rose-400",
          hex: "#f43f5e",
        };
      case "amber":
        return {
          bg: "bg-amber-500 dark:bg-amber-550",
          bgHover: "hover:bg-amber-600 dark:hover:bg-amber-500",
          text: "text-amber-600 dark:text-amber-400",
          border: "border-amber-100 dark:border-amber-950/50",
          borderPrimary: "border-amber-500",
          gradient: "from-amber-500 to-orange-500",
          gradientBg: "bg-amber-50/40 dark:bg-[#1f160e]/20",
          badge: "bg-amber-100 text-amber-750 dark:bg-amber-900/40 dark:text-amber-300",
          ring: "ring-amber-500/20",
          shadow: "shadow-amber-500/15",
          accentBg: "bg-amber-500 text-white shadow-xs",
          textMuted: "text-amber-500 dark:text-amber-400",
          hex: "#f59e0b",
        };
      case "terracotta":
        return {
          bg: "bg-[#D5360C]",
          bgHover: "hover:bg-[#B82E0A]",
          text: "text-[#D5360C]",
          border: "border-[#D5360C]/20",
          borderPrimary: "border-[#D5360C]",
          gradient: "from-[#D5360C] to-[#E6D5BD]",
          gradientBg: "bg-[#D5360C]/10",
          badge: "bg-[#D5360C]/20 text-[#D5360C]",
          ring: "ring-[#D5360C]/30",
          shadow: "shadow-[#D5360C]/20",
          accentBg: "bg-[#D5360C] text-white shadow-xs",
          textMuted: "text-[#D5360C]/70",
          hex: "#D5360C",
        };
      case "indigo":
      default:
        return {
          bg: "bg-[#4F46E5] dark:bg-[#4F46E5]",
          bgHover: "hover:bg-[#4338CA]",
          text: "text-[#4F46E5] dark:text-[#818CF8]",
          border: "border-indigo-100 dark:border-indigo-950/50",
          borderPrimary: "border-[#4F46E5]",
          gradient: "from-[#4F46E5] to-[#6366F1] dark:to-[#818CF8]",
          gradientBg: "bg-indigo-50/40 dark:bg-[#110e20]/20",
          badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300",
          ring: "ring-indigo-500/20",
          shadow: "shadow-indigo-500/15",
          accentBg: "bg-[#4F46E5] text-white shadow-xs",
          textMuted: "text-indigo-500 dark:text-indigo-400",
          hex: "#4F46E5",
        };
    }
  };

  useEffect(() => {
    if (themeStyle === "terracotta") {
      document.documentElement.setAttribute("data-theme", "terracotta");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("themeStyle", themeStyle);
  }, [themeStyle]);

  useEffect(() => {
    const config = getThemeConfig(primaryColor);
    if (config?.hex) {
      document.documentElement.style.setProperty("--primary", config.hex);
      document.documentElement.style.setProperty("--accent", config.hex);
      document.documentElement.style.setProperty("--primary-soft", `${config.hex}22`);
      document.documentElement.style.setProperty("--accent-soft", `${config.hex}18`);
      document.documentElement.style.setProperty("--accent-glow", `${config.hex}40`);
    }
    document.documentElement.setAttribute("data-primary-color", primaryColor);
    localStorage.setItem("primaryColor", primaryColor);
  }, [primaryColor, themeStyle]);

  const handleUpdateThemeStyle = (style: "default" | "terracotta") => {
    setThemeStyle(style);
    if (style === "terracotta") {
      document.documentElement.setAttribute("data-theme", "terracotta");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("themeStyle", style);
  };

  const [avatarTab, setAvatarTab] = useState<"upload" | "ai" | "abstract">("upload");
  const [avatarPrompt, setAvatarPrompt] = useState("");
  const [generatingAvatar, setGeneratingAvatar] = useState(false);
  const [avatarGenerationError, setAvatarGenerationError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const handleAvatarFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = e.target?.result as string;
      if (base64) {
        handleUpdateCustomAvatar(base64);
        setAvatarModalOpen(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateAIAvatar = async () => {
    if (!avatarPrompt.trim()) {
      setAvatarGenerationError("Please describe what you want to generate.");
      return;
    }

    setGeneratingAvatar(true);
    setAvatarGenerationError("");

    try {
      const res = await fetch("/api/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: avatarPrompt }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate AI avatar.");
      }

      const data = await res.json();
      if (data.svg) {
        const base64Svg = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(data.svg)));
        handleUpdateCustomAvatar(base64Svg);
        setAvatarModalOpen(false);
        setAvatarPrompt("");
      } else {
        throw new Error("Server returned empty vector content.");
      }
    } catch (err: any) {
      console.error(err);
      setAvatarGenerationError(err.message || "Something went wrong during generation.");
    } finally {
      setGeneratingAvatar(false);
    }
  };

  const abstractPalettes = [
    { name: "Cosmic Twilight", colors: ["#4f46e5", "#06b6d4", "#ec4899"] },
    { name: "Forest Moss", colors: ["#10b981", "#059669", "#3b82f6"] },
    { name: "Sunset Horizon", colors: ["#f43f5e", "#f59e0b", "#d97706"] },
    { name: "Cyberpunk Pink", colors: ["#d946ef", "#8b5cf6", "#06b6d4"] },
    { name: "Classic Indigo", colors: ["#6366f1", "#4f46e5", "#312e81"] },
    { name: "Ocean Breeze", colors: ["#3b82f6", "#06b6d4", "#0ea5e9"] },
  ];

  const handleGenerateAbstractAvatar = (colors: string[]) => {
    const svgText = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${colors[0]}" />
          <stop offset="50%" stop-color="${colors[1] || colors[0]}" />
          <stop offset="100%" stop-color="${colors[2] || colors[1] || colors[0]}" />
        </linearGradient>
        <radialGradient id="glow" cx="20%" cy="20%" r="60%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="100" height="100" fill="url(#grad1)" />
      <circle cx="50" cy="50" r="30" fill="none" stroke="#ffffff" stroke-width="1.5" stroke-opacity="0.15" />
      <circle cx="50" cy="50" r="20" fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.1" />
      <path d="M 0,100 Q 30,40 70,60 T 100,0" fill="none" stroke="#ffffff" stroke-width="2" stroke-opacity="0.2" />
      <rect width="100" height="100" fill="url(#glow)" />
    </svg>`;

    const base64Svg = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgText)));
    handleUpdateCustomAvatar(base64Svg);
    setAvatarModalOpen(false);
  };

  const handleUpdateWeeklyTarget = (target: number) => {
    setWeeklyTarget(target);
    localStorage.setItem("weeklyTarget", String(target));
  };

  const handleUpdatePrimaryColor = (color: string) => {
    setPrimaryColor(color);
    localStorage.setItem("primaryColor", color);
  };



  // Load syllabuses from Turso
  const loadSyllabusesFromDatabase = async (uid: string) => {
    try {
      setSyncing(true);
      const list = await loadUserSyllabusesFromTurso(uid);
      setSyllabuses(list);

      const savedActiveId = localStorage.getItem("activeSyllabusId");
      const active = list.find(s => s.id === savedActiveId) || list[0] || null;
      setCurrentSyllabus(active);

      // Migrate any legacy local syllabuses to user's Turso account
      const localLegacyListStr = localStorage.getItem("syllabuses");

      if (localLegacyListStr) {
        try {
          const localList = JSON.parse(localLegacyListStr) as Syllabus[];
          for (const item of localList) {
            const migrated: Syllabus = { ...item, userId: uid };
            await syncSyllabusToTurso(migrated, uid);
            if (!list.some(s => s.id === item.id)) {
              list.push(migrated);
            }
          }
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setSyllabuses([...list]);
          const activeAfterMigration = list.find(s => s.id === savedActiveId) || list[0] || null;
          setCurrentSyllabus(activeAfterMigration);
          localStorage.removeItem("syllabuses");
        } catch (e) {
          console.error("Migration error:", e);
        }
      }
    } catch (err) {
      console.error("Error loading syllabuses from Turso:", err);
    } finally {
      setSyncing(false);
    }
  };

  // Monitor Authentication state and load appropriate syllabuses
  useEffect(() => {
    if (!clerkLoaded) return;

    if (user?.id) {
      loadSyllabusesFromDatabase(user.id);
    } else {
      const localListStr = localStorage.getItem("syllabuses");
      const legacySingleStr = localStorage.getItem("syllabus");

      let list: Syllabus[] = [];
      if (localListStr) {
        try {
          list = JSON.parse(localListStr);
        } catch {}
      } else if (legacySingleStr) {
        try {
          const single = JSON.parse(legacySingleStr);
          list = [single];
          localStorage.setItem("syllabuses", JSON.stringify(list));
          localStorage.removeItem("syllabus");
        } catch {}
      }

      setSyllabuses(list);
      const savedActiveId = localStorage.getItem("activeSyllabusId");
      const active = list.find(s => s.id === savedActiveId) || list[0] || null;
      setCurrentSyllabus(active);
    }
  }, [clerkLoaded, user?.id]);

  // Calculate day difference for targetDate
  const getDaysDifference = (targetDateStr: string): number => {
    try {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());

      const [yr, mo, dy] = targetDateStr.split("-").map(Number);
      const targetDate = new Date(yr, mo - 1, dy);

      const diffTime = targetDate.getTime() - todayStart.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (err) {
      return NaN;
    }
  };

  // Run proactive daily target reminders once per day
  useEffect(() => {
    if (!currentSyllabus) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const lastCheck = localStorage.getItem("lastReminderCheckDate");

    if (lastCheck === todayStr) {
      return;
    }

    let checkedCount = 0;
    currentSyllabus.units.forEach((unit) => {
      unit.topics.forEach((topic) => {
        if (!topic.completed && topic.targetDate) {
          const diffDays = getDaysDifference(topic.targetDate);
          if (diffDays === 3) {
            addNotification(
              "Target Approaching ⏳",
              `Reminder: ${topic.name} is pending. 3 days left to hit your target!`,
              "warning"
            );
            checkedCount++;
          } else if (diffDays === 1) {
            addNotification(
              "Due Tomorrow! ⚠️",
              `Urgent: ${topic.name} is due tomorrow! Finish it up.`,
              "warning"
            );
            checkedCount++;
          } else if (diffDays === 0) {
            addNotification(
              "Due Today! 🚨",
              `Deadline Today: Complete ${topic.name} today to stay on track!`,
              "warning"
            );
            checkedCount++;
          }
        }
      });
    });

    // Mark as checked for today even if no reminders were triggered, to prevent repeated scans on every render/navigation
    localStorage.setItem("lastReminderCheckDate", todayStr);
  }, [currentSyllabus?.id]);

  // Generic Save syllabus helper (Local Storage or Turso)
  const saveSyllabus = async (syllabus: Syllabus) => {
    try {
      setSyncing(true);
      if (user) {
        await syncSyllabusToTurso(syllabus, user.id);
      }

      setSyllabuses(prev => {
        const list = prev.map(s => s.id === syllabus.id ? syllabus : s);
        if (!list.some(s => s.id === syllabus.id)) {
          list.unshift(syllabus);
        }
        localStorage.setItem("syllabuses", JSON.stringify(list));
        return list;
      });
    } catch (err) {
      console.error("Error saving syllabus:", err);
    } finally {
      setSyncing(false);
    }
  };

  // Trigger backup of all syllabuses to Turso
  const handleTriggerCloudBackup = async () => {
    if (!user) return;
    try {
      setSyncing(true);
      for (const syllabus of syllabuses) {
        await syncSyllabusToTurso(syllabus, user.id);
      }
    } catch (err) {
      console.error("Cloud backup error:", err);
      throw err;
    } finally {
      setSyncing(false);
    }
  };

  // Handle newly parsed syllabus from PDF/Text Upload
  const handleSyllabusParsed = async (parsedData: {
    subjectName: string;
    units: Array<{ name: string; topics: string[] }>;
  }) => {
    // Transform into our clean Syllabus structure
    const newUnits: Unit[] = parsedData.units.map((u, uIdx) => ({
      id: `unit_${uIdx}_${Date.now()}`,
      name: u.name,
      topics: u.topics.map((t, tIdx) => ({
        id: `topic_${uIdx}_${tIdx}_${Date.now()}`,
        name: t,
        completed: false,
      })),
    }));

    const newSyllabus: Syllabus = {
      id: `syllabus_${Date.now()}`,
      userId: user ? user.id : "guest",
      subjectName: parsedData.subjectName,
      units: newUnits,
      createdAt: new Date().toISOString(),
      dailyTarget: 4,
      streak: 0,
    };

    setSyllabuses(prev => [newSyllabus, ...prev]);
    setCurrentSyllabus(newSyllabus);
    localStorage.setItem("activeSyllabusId", newSyllabus.id);
    setIsAddingCourse(false); // Reset add mode state
    setUploadState({
      loading: false,
      error: null,
      mode: "file",
      syllabusText: "",
      images: [],
      previewSyllabus: null,
    });
    await saveSyllabus(newSyllabus);
    addNotification(
      "Syllabus Added! 📚",
      `Successfully loaded and structured your syllabus for "${parsedData.subjectName}". You can now start tracking your units!`,
      "success"
    );
  };

  // Toggle topic completion
  const handleToggleTopic = async (unitId: string, topicId: string) => {
    if (!currentSyllabus) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    })();

    const countCompletedToday = (units: Unit[]) => {
      return units
        .flatMap((u) => u.topics)
        .filter((t) => t.completed && t.completedAt && t.completedAt.startsWith(todayStr)).length;
    };

    const completedTodayBefore = countCompletedToday(currentSyllabus.units);

    // Toggle target topic
    const updatedUnits = currentSyllabus.units.map((unit) => {
      if (unit.id !== unitId) return unit;
      return {
        ...unit,
        topics: unit.topics.map((topic) => {
          if (topic.id !== topicId) return topic;
          const nextCompleted = !topic.completed;
          return {
            ...topic,
            completed: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined,
          };
        }),
      };
    });

    const completedTodayAfter = countCompletedToday(updatedUnits);

    // Find the toggled topic details for notification
    let toggledTopicName = "";
    let isCompletedNow = false;
    currentSyllabus.units.forEach((unit) => {
      if (unit.id === unitId) {
        unit.topics.forEach((topic) => {
          if (topic.id === topicId) {
            toggledTopicName = topic.name;
            isCompletedNow = !topic.completed;
          }
        });
      }
    });

    if (toggledTopicName) {
      if (isCompletedNow) {
        addNotification(
          "🎉 Target Achieved!",
          `Topic '${toggledTopicName}' successfully mastered!`,
          "success"
        );

        // Check if unit is 100% completed
        const targetUnit = updatedUnits.find((u) => u.id === unitId);
        if (targetUnit) {
          const allCompleted = targetUnit.topics.every((t) => t.completed);
          if (allCompleted) {
            addNotification(
              "🚀 Amazing!",
              `Unit '${targetUnit.name}' is 100% Completed! Keep up the great momentum!`,
              "success"
            );
          }
        }
      } else {
        addNotification(
          "Topic Reset",
          `"${toggledTopicName}" has been unmarked.`,
          "info"
        );
      }
    }

    // Handle streak update
    const hasPlannedTopics = currentSyllabus.plannedTopicsToday && currentSyllabus.plannedTopicsToday.length > 0;

    const areAllPlannedCompleted = (units: Unit[], plannedIds: string[]) => {
      if (!plannedIds || plannedIds.length === 0) return false;
      const allTopics = units.flatMap(u => u.topics);
      return plannedIds.every(id => {
        const t = allTopics.find(topic => topic.id === id);
        return t ? t.completed : false;
      });
    };

    const plannedCompletedBefore = hasPlannedTopics ? areAllPlannedCompleted(currentSyllabus.units, currentSyllabus.plannedTopicsToday || []) : false;
    const plannedCompletedAfter = hasPlannedTopics ? areAllPlannedCompleted(updatedUnits, currentSyllabus.plannedTopicsToday || []) : false;

    let nextStreak = currentSyllabus.streak || 0;
    let nextLastStudyDate = currentSyllabus.lastStudyDate || "";

    if (hasPlannedTopics && plannedCompletedAfter && !plannedCompletedBefore) {
      // Met target today!
      if (nextLastStudyDate === yesterdayStr) {
        nextStreak += 1;
      } else if (nextLastStudyDate !== todayStr) {
        nextStreak = 1;
      }
      nextLastStudyDate = todayStr;
      addNotification(
        "Daily Goal Accomplished! 🏆",
        `Phenomenal! You've completed all planned topics for today's session. Your current streak is now ${nextStreak} day(s)!`,
        "success"
      );
    } else if (hasPlannedTopics && !plannedCompletedAfter && plannedCompletedBefore) {
      // Fell below target today!
      if (nextLastStudyDate === todayStr) {
        nextStreak = Math.max(0, nextStreak - 1);
        nextLastStudyDate = yesterdayStr;
      }
    }

    const updatedSyllabus: Syllabus = {
      ...currentSyllabus,
      units: updatedUnits,
      streak: nextStreak,
      lastStudyDate: nextLastStudyDate,
    };

    setCurrentSyllabus(updatedSyllabus);
    setSyllabuses(prev => prev.map(s => s.id === updatedSyllabus.id ? updatedSyllabus : s));
    await saveSyllabus(updatedSyllabus);
  };

  // Undo topic completion
  const handleUndoTopicCompletion = async (topicId: string) => {
    if (!currentSyllabus) return;

    let targetTopicName = "";
    const updatedUnits = currentSyllabus.units.map((unit) => {
      const hasTopic = unit.topics.some((t) => t.id === topicId);
      if (!hasTopic) return unit;
      return {
        ...unit,
        topics: unit.topics.map((topic) => {
          if (topic.id !== topicId) return topic;
          targetTopicName = topic.name;
          return {
            ...topic,
            completed: false,
            completedAt: undefined,
          };
        }),
      };
    });

    if (!targetTopicName) return;

    const todayStr = new Date().toISOString().split("T")[0];
    const yesterdayStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().split("T")[0];
    })();

    const hasPlannedTopics = currentSyllabus.plannedTopicsToday && currentSyllabus.plannedTopicsToday.length > 0;

    const areAllPlannedCompleted = (units: Unit[], plannedIds: string[]) => {
      if (!plannedIds || plannedIds.length === 0) return false;
      const allTopics = units.flatMap(u => u.topics);
      return plannedIds.every(id => {
        const t = allTopics.find(topic => topic.id === id);
        return t ? t.completed : false;
      });
    };

    const plannedCompletedBefore = hasPlannedTopics ? areAllPlannedCompleted(currentSyllabus.units, currentSyllabus.plannedTopicsToday || []) : false;
    const plannedCompletedAfter = hasPlannedTopics ? areAllPlannedCompleted(updatedUnits, currentSyllabus.plannedTopicsToday || []) : false;

    let nextStreak = currentSyllabus.streak || 0;
    let nextLastStudyDate = currentSyllabus.lastStudyDate || "";

    if (hasPlannedTopics && !plannedCompletedAfter && plannedCompletedBefore) {
      if (nextLastStudyDate === todayStr) {
        nextStreak = Math.max(0, nextStreak - 1);
        nextLastStudyDate = yesterdayStr;
      }
    }

    const updatedSyllabus: Syllabus = {
      ...currentSyllabus,
      units: updatedUnits,
      streak: nextStreak,
      lastStudyDate: nextLastStudyDate,
    };

    setCurrentSyllabus(updatedSyllabus);
    setSyllabuses(prev => prev.map(s => s.id === updatedSyllabus.id ? updatedSyllabus : s));
    await saveSyllabus(updatedSyllabus);

    addNotification(
      "Topic Reset ↩️",
      `Topic '${targetTopicName}' moved back to pending.`,
      "info"
    );
  };

  // Update Exam countdown date
  const handleUpdateExamDate = async (date: string) => {
    if (!currentSyllabus) return;
    const updated: Syllabus = { ...currentSyllabus, examDate: date };
    setCurrentSyllabus(updated);
    setSyllabuses(prev => prev.map(s => s.id === updated.id ? updated : s));
    await saveSyllabus(updated);
  };

  // Update Topic Target Date, Topic Name, and Unit Name from Dashboard
  const handleUpdateTopicAndUnit = async (unitId: string, topicId: string, newUnitName: string, newTopicName: string, newTargetDate: string) => {
    if (!currentSyllabus) return;

    const updatedUnits = currentSyllabus.units.map((unit) => {
      if (unit.id !== unitId) return unit;
      return {
        ...unit,
        name: newUnitName,
        topics: unit.topics.map((topic) => {
          if (topic.id !== topicId) return topic;
          return {
            ...topic,
            name: newTopicName,
            targetDate: newTargetDate,
          };
        }),
      };
    });

    const updatedSyllabus: Syllabus = {
      ...currentSyllabus,
      units: updatedUnits,
    };

    setCurrentSyllabus(updatedSyllabus);
    setSyllabuses(prev => prev.map(s => s.id === updatedSyllabus.id ? updatedSyllabus : s));
    await saveSyllabus(updatedSyllabus);

    addNotification(
      "Task Updated! ✏️",
      `Successfully customized "${newTopicName}" and target date.`,
      "success"
    );
  };

  // Update Daily goal target count
  const handleUpdateDailyTarget = async (target: number) => {
    if (!currentSyllabus) return;
    const updated: Syllabus = { ...currentSyllabus, dailyTarget: target };
    setCurrentSyllabus(updated);
    setSyllabuses(prev => prev.map(s => s.id === updated.id ? updated : s));
    await saveSyllabus(updated);
  };

  // Update Planned Topics for today
  const handleUpdatePlannedTopics = async (plannedTopicIds: string[]) => {
    if (!currentSyllabus) return;
    const updated: Syllabus = { ...currentSyllabus, plannedTopicsToday: plannedTopicIds };
    setCurrentSyllabus(updated);
    setSyllabuses(prev => prev.map(s => s.id === updated.id ? updated : s));
    await saveSyllabus(updated);
  };

  // Update topic notes
  const handleUpdateTopicNotes = async (unitId: string, topicId: string, notes: string) => {
    if (!currentSyllabus) return;

    const updatedUnits = currentSyllabus.units.map((unit) => {
      if (unit.id !== unitId) return unit;
      return {
        ...unit,
        topics: unit.topics.map((topic) => {
          if (topic.id !== topicId) return topic;
          return {
            ...topic,
            notes,
          };
        }),
      };
    });

    const updatedSyllabus: Syllabus = {
      ...currentSyllabus,
      units: updatedUnits,
    };

    setCurrentSyllabus(updatedSyllabus);
    setSyllabuses(prev => prev.map(s => s.id === updatedSyllabus.id ? updatedSyllabus : s));
    await saveSyllabus(updatedSyllabus);
  };

  // Add a new Keep Note to current syllabus or standalone notes
  const handleKeepAddNote = async (noteInput: Omit<KeepNote, "id" | "createdAt">) => {
    const newNote: KeepNote = {
      ...noteInput,
      id: "note_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
    };

    if (!currentSyllabus) {
      setStandaloneNotes((prev) => {
        const next = [newNote, ...prev];
        localStorage.setItem("standaloneNotes", JSON.stringify(next));
        return next;
      });
      addNotification(
        "Note Created 📝",
        `Saved note "${noteInput.title || "Untitled Note"}" successfully.`,
        "info"
      );
      return;
    }

    const currentKeepNotes = currentSyllabus.keepNotes || [];
    const updatedKeepNotes = [newNote, ...currentKeepNotes];
    const updatedSyllabus: Syllabus = {
      ...currentSyllabus,
      keepNotes: updatedKeepNotes,
    };
    setCurrentSyllabus(updatedSyllabus);
    setSyllabuses(prev => prev.map(s => s.id === updatedSyllabus.id ? updatedSyllabus : s));
    await saveSyllabus(updatedSyllabus);
    addNotification(
      "Note Created 📝",
      `Saved note "${noteInput.title || "Untitled Note"}" successfully.`,
      "info"
    );
  };

  // Update an existing Keep Note in current syllabus or standalone notes
  const handleKeepUpdateNote = async (updatedNote: KeepNote) => {
    if (!currentSyllabus) {
      setStandaloneNotes((prev) => {
        const next = prev.map((note) => (note.id === updatedNote.id ? updatedNote : note));
        localStorage.setItem("standaloneNotes", JSON.stringify(next));
        return next;
      });
      return;
    }

    const currentKeepNotes = currentSyllabus.keepNotes || [];
    const updatedKeepNotes = currentKeepNotes.map((note) =>
      note.id === updatedNote.id ? updatedNote : note
    );
    const updatedSyllabus: Syllabus = {
      ...currentSyllabus,
      keepNotes: updatedKeepNotes,
    };
    setCurrentSyllabus(updatedSyllabus);
    setSyllabuses(prev => prev.map(s => s.id === updatedSyllabus.id ? updatedSyllabus : s));
    await saveSyllabus(updatedSyllabus);
  };

  // Delete a Keep Note from current syllabus or standalone notes
  const handleKeepDeleteNote = async (noteId: string) => {
    if (!currentSyllabus) {
      setStandaloneNotes((prev) => {
        const next = prev.filter((note) => note.id !== noteId);
        localStorage.setItem("standaloneNotes", JSON.stringify(next));
        return next;
      });
      return;
    }

    const currentKeepNotes = currentSyllabus.keepNotes || [];
    const updatedKeepNotes = currentKeepNotes.filter((note) => note.id !== noteId);
    const updatedSyllabus: Syllabus = {
      ...currentSyllabus,
      keepNotes: updatedKeepNotes,
    };
    setCurrentSyllabus(updatedSyllabus);
    setSyllabuses(prev => prev.map(s => s.id === updatedSyllabus.id ? updatedSyllabus : s));
    await saveSyllabus(updatedSyllabus);
  };

  // Login - redirect to auth view
  const handleLogin = async () => {
    setGuestMode(false);
    localStorage.removeItem("meridian_guest_mode");
  };

  // Logout
  const handleLogout = async () => {
    try {
      await clerk.signOut();
      setGuestMode(false);
      localStorage.removeItem("meridian_guest_mode");
      setSyllabuses([]);
      setCurrentSyllabus(null);
      localStorage.removeItem("activeSyllabusId");
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  // Reset progress of current syllabus
  const handleResetSyllabus = () => {
    if (!currentSyllabus) return;
    setConfirmModal({
      isOpen: true,
      title: "Reset Progress",
      message: `Are you sure you want to reset all progress for "${currentSyllabus.subjectName}"? All checklist checkmarks will be cleared.`,
      confirmText: "Reset Progress",
      type: "warning",
      onConfirm: async () => {
        const resetUnits = currentSyllabus.units.map(unit => ({
          ...unit,
          topics: unit.topics.map(topic => ({
            ...topic,
            completed: false,
            completedAt: undefined
          }))
        }));

        const updated: Syllabus = {
          ...currentSyllabus,
          units: resetUnits,
          streak: 0,
          lastStudyDate: undefined
        };

        setCurrentSyllabus(updated);
        setSyllabuses(prev => prev.map(s => s.id === updated.id ? updated : s));
        await saveSyllabus(updated);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        addNotification(
          "Progress Reset 🔄",
          `All checklist progress has been reset for "${currentSyllabus.subjectName}".`,
          "warning"
        );
      }
    });
  };

  // Master Reset all progress, custom dates, and activities
  const handleMasterReset = () => {
    setConfirmModal({
      isOpen: true,
      title: "Master Reset",
      message: "Are you sure you want to reset all progress? This will clear all completed tasks, target dates, and activity history. This action cannot be undone.",
      confirmText: "Reset All",
      type: "danger",
      onConfirm: async () => {
        try {
          setSyncing(true);
          const resetSyllabuses = syllabuses.map((s) => ({
            ...s,
            streak: 0,
            lastStudyDate: undefined,
            examDate: undefined,
            keepNotes: [],
            units: s.units.map((unit) => ({
              ...unit,
              topics: unit.topics.map((topic) => ({
                ...topic,
                completed: false,
                completedAt: undefined,
                notes: undefined,
                targetDate: undefined,
                status: "pending",
              })),
            })),
          }));

          setSyllabuses(resetSyllabuses);
          if (currentSyllabus) {
            const updatedCurrent = resetSyllabuses.find(s => s.id === currentSyllabus.id) || null;
            setCurrentSyllabus(updatedCurrent);
          }

          localStorage.setItem("syllabuses", JSON.stringify(resetSyllabuses));

          if (user) {
            for (const s of resetSyllabuses) {
              await syncSyllabusToTurso(s, user.id);
            }
          }

          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          addNotification(
            "Dashboard Reset 🔄",
            "Dashboard completely reset to default.",
            "success"
          );
        } catch (err) {
          console.error("Master Reset failed:", err);
          addNotification(
            "Reset Failed ⚠️",
            "Could not complete Master Reset. Please try again.",
            "warning"
          );
        } finally {
          setSyncing(false);
        }
      }
    });
  };

  // Delete specific syllabus
  const handleDeleteSyllabus = (id: string) => {
    const target = syllabuses.find(s => s.id === id);
    if (!target) return;

    setConfirmModal({
      isOpen: true,
      title: "Delete Subject",
      message: `Are you sure you want to delete "${target.subjectName}"? All tracking and study logs will be permanently erased.`,
      confirmText: "Delete",
      type: "danger",
      onConfirm: async () => {
        try {
          setSyncing(true);
          if (user) {
            await deleteSyllabusFromTurso(id, user.id);
          }

          const updatedList = syllabuses.filter(s => s.id !== id);
          setSyllabuses(updatedList);

          if (!user) {
            localStorage.setItem("syllabuses", JSON.stringify(updatedList));
          }

          if (currentSyllabus?.id === id) {
            const nextActive = updatedList[0] || null;
            setCurrentSyllabus(nextActive);
            if (nextActive) {
              localStorage.setItem("activeSyllabusId", nextActive.id);
            } else {
              localStorage.removeItem("activeSyllabusId");
            }
          }
        } catch (err) {
          console.error("Error deleting syllabus:", err);
        } finally {
          setSyncing(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Reset all application data (irrevocable)
  const handleResetAllData = () => {
    setConfirmModal({
      isOpen: true,
      title: "FACTORY RESET DATA",
      message: "Are you absolutely sure you want to delete ALL subjects, tracked unit topics, and keep notes? This will wipe both local and cloud databases. This action is completely irreversible.",
      confirmText: "Wipe All Data",
      type: "danger",
      onConfirm: async () => {
        try {
          setSyncing(true);
          if (user) {
            // Delete all from Turso
            for (const s of syllabuses) {
              await deleteSyllabusFromTurso(s.id, user.id);
            }
          }
          // Clear states
          setSyllabuses([]);
          setCurrentSyllabus(null);
          localStorage.removeItem("syllabuses");
          localStorage.removeItem("activeSyllabusId");
          setCurrentView("dashboard");
        } catch (err) {
          console.error("Error factory resetting data:", err);
        } finally {
          setSyncing(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Import syllabuses list
  const handleImportData = async (importedList: Syllabus[]) => {
    try {
      setSyncing(true);
      // Link to user if logged in
      const linked = importedList.map(s => ({
        ...s,
        userId: user ? user.id : "guest"
      }));

      // Update Turso if logged in
      if (user) {
        for (const s of linked) {
          await syncSyllabusToTurso(s, user.id);
        }
      }

      const merged = [...linked, ...syllabuses.filter(s => !linked.some(l => l.id === s.id))];
      setSyllabuses(merged);

      if (!user) {
        localStorage.setItem("syllabuses", JSON.stringify(merged));
      }

      if (merged.length > 0) {
        setCurrentSyllabus(merged[0]);
        localStorage.setItem("activeSyllabusId", merged[0].id);
      }
    } catch (err) {
      console.error("Error importing syllabuses:", err);
    } finally {
      setSyncing(false);
    }
  };

  // Computed properties
  const allTopics = currentSyllabus ? currentSyllabus.units.flatMap((u) => u.topics) : [];
  const completedTopics = allTopics.filter((t) => t.completed);
  const remainingTopics = allTopics.filter((t) => !t.completed);

  const todayStr = new Date().toISOString().split("T")[0];
  const completedTodayList = allTopics.filter(
    (t) => t.completed && t.completedAt && t.completedAt.startsWith(todayStr)
  );

  const getPrimaryColorClasses = () => {
    switch (primaryColor) {
      case "violet":
        return {
          bg: "bg-violet-600 dark:bg-violet-500",
          bgHover: "hover:bg-violet-700 dark:hover:bg-violet-600",
          border: "border-violet-600 dark:border-violet-500",
          text: "text-violet-600 dark:text-violet-400",
          bgLight: "bg-violet-50 dark:bg-violet-950/45",
          borderLight: "border-violet-500/20",
          textHover: "hover:text-violet-700 dark:hover:text-violet-300",
          ring: "focus:ring-violet-500",
          bgLightHover: "hover:bg-violet-100 dark:hover:bg-violet-900/45",
          textLight: "text-violet-700 dark:text-violet-400"
        };
      case "emerald":
        return {
          bg: "bg-emerald-600 dark:bg-emerald-500",
          bgHover: "hover:bg-emerald-700 dark:hover:bg-emerald-600",
          border: "border-emerald-600 dark:border-emerald-500",
          text: "text-emerald-600 dark:text-emerald-400",
          bgLight: "bg-emerald-50 dark:bg-emerald-950/45",
          borderLight: "border-emerald-500/20",
          textHover: "hover:text-emerald-700 dark:hover:text-emerald-300",
          ring: "focus:ring-emerald-500",
          bgLightHover: "hover:bg-emerald-100 dark:hover:bg-emerald-900/45",
          textLight: "text-emerald-700 dark:text-emerald-400"
        };
      case "rose":
        return {
          bg: "bg-rose-600 dark:bg-rose-500",
          bgHover: "hover:bg-rose-700 dark:hover:bg-rose-600",
          border: "border-rose-600 dark:border-rose-500",
          text: "text-rose-600 dark:text-rose-400",
          bgLight: "bg-rose-50 dark:bg-rose-950/45",
          borderLight: "border-rose-500/20",
          textHover: "hover:text-rose-700 dark:hover:text-rose-300",
          ring: "focus:ring-rose-500",
          bgLightHover: "hover:bg-rose-100 dark:hover:bg-rose-900/45",
          textLight: "text-rose-700 dark:text-rose-400"
        };
      case "amber":
        return {
          bg: "bg-amber-500 dark:bg-amber-550",
          bgHover: "hover:bg-amber-600 dark:hover:bg-amber-500",
          border: "border-amber-500 dark:border-amber-500",
          text: "text-amber-600 dark:text-amber-400",
          bgLight: "bg-amber-50 dark:bg-amber-950/45",
          borderLight: "border-amber-500/20",
          textHover: "hover:text-amber-700 dark:hover:text-amber-300",
          ring: "focus:ring-amber-500",
          bgLightHover: "hover:bg-amber-100 dark:hover:bg-amber-900/45",
          textLight: "text-amber-700 dark:text-amber-400"
        };
      case "indigo":
      default:
        return {
          bg: "bg-primary-app",
          bgHover: "hover:bg-primary-active-app",
          border: "border-primary-app",
          text: "text-primary-app",
          bgLight: "bg-primary-soft-app/25 dark:bg-primary-soft-app/10",
          borderLight: "border-primary-app/20",
          textHover: "hover:text-primary-active-app",
          ring: "focus:ring-primary-app",
          bgLightHover: "hover:bg-primary-soft-app/35 dark:hover:bg-primary-soft-app/20",
          textLight: "text-primary-app"
        };
    }
  };

  const pColor = getPrimaryColorClasses();

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins} mins ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours} hours ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays} days ago`;
      return date.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    } catch {
      return "Recently";
    }
  };

  const getRecentActivities = () => {
    const activities: Array<{
      id: string;
      type: "completed" | "started" | "note";
      title: string;
      detail: string;
      time: string;
      timestamp: number;
    }> = [];

    if (currentSyllabus) {
      currentSyllabus.units.forEach((unit) => {
        unit.topics.forEach((topic) => {
          if (topic.completed && topic.completedAt) {
            const compTime = new Date(topic.completedAt);
            activities.push({
              id: topic.id,
              type: "completed",
              title: `Completed "${topic.name}"`,
              detail: unit.name,
              time: formatRelativeTime(topic.completedAt),
              timestamp: compTime.getTime(),
            });
          }
          if (topic.notes) {
            activities.push({
              id: `note_${topic.id}`,
              type: "note",
              title: `Added note for "${topic.name}"`,
              detail: topic.notes,
              time: "Recently",
              timestamp: Date.now() - 3600000,
            });
          }
        });
      });

      if (currentSyllabus.keepNotes) {
        currentSyllabus.keepNotes.forEach((note) => {
          const noteTime = new Date(note.createdAt);
          activities.push({
            id: note.id,
            type: "note",
            title: `Created note "${note.title}"`,
            detail: note.content.substring(0, 40) + (note.content.length > 40 ? "..." : ""),
            time: formatRelativeTime(note.createdAt),
            timestamp: noteTime.getTime(),
          });
        });
      }
    }

    if (activities.length === 0 && !currentSyllabus) {
      const time1 = new Date(Date.now() - 7200000).toISOString();
      const time2 = new Date(Date.now() - 18000000).toISOString();
      const time3 = new Date(Date.now() - 86400000).toISOString();
      activities.push({
        id: "mock1",
        type: "completed",
        title: 'Completed "Database Management System - Keys"',
        detail: "DBMS - Chapter 3",
        time: formatRelativeTime(time1),
        timestamp: Date.now() - 7200000,
      });
      activities.push({
        id: "mock2",
        type: "started",
        title: 'Started "Operating System - CPU Scheduling"',
        detail: "Operating System - Chapter 2",
        time: formatRelativeTime(time2),
        timestamp: Date.now() - 18000000,
      });
      activities.push({
        id: "mock3",
        type: "note",
        title: 'Added new note in "Computer Networks - TCP/IP"',
        detail: "Computer Networks - Chapter 4",
        time: formatRelativeTime(time3),
        timestamp: Date.now() - 86400000,
      });
    }

    return activities.sort((a, b) => b.timestamp - a.timestamp);
  };

  const getUpcomingTasks = () => {
    const tasks: Array<{
      id: string;
      unitId?: string;
      topicId?: string;
      unitName: string;
      topicName: string;
      date: string;
      targetDate?: string;
      statusColor: string;
    }> = [];

    if (currentSyllabus) {
      let count = 0;
      for (const unit of currentSyllabus.units) {
        for (const topic of unit.topics) {
          if (!topic.completed && topic.targetDate) {
            let formattedDate = "";
            try {
              const [yr, mo, dy] = topic.targetDate.split("-").map(Number);
              const tDate = new Date(yr, mo - 1, dy);
              formattedDate = tDate.toLocaleDateString("en-US", { day: "numeric", month: "short" });
            } catch (err) {
              formattedDate = topic.targetDate;
            }

            const statusColors = ["bg-emerald-500", "bg-amber-500", "bg-rose-500"];
            tasks.push({
              id: topic.id,
              unitId: unit.id,
              topicId: topic.id,
              unitName: unit.name,
              topicName: topic.name,
              date: formattedDate,
              targetDate: topic.targetDate,
              statusColor: statusColors[count % statusColors.length],
            });
            count++;
          }
        }
      }
    }

    if (tasks.length === 0 && !currentSyllabus) {
      tasks.push({
        id: "mock-task-1",
        unitName: "DBMS - Normalization",
        topicName: "Third Normal Form & BCNF",
        date: "24 May",
        targetDate: "2026-05-24",
        statusColor: "bg-green-500",
      });
      tasks.push({
        id: "mock-task-2",
        unitName: "Operating System - Processes",
        topicName: "Process Synchronization & Semaphores",
        date: "26 May",
        targetDate: "2026-05-26",
        statusColor: "bg-amber-500",
      });
      tasks.push({
        id: "mock-task-3",
        unitName: "CN - Flow Control",
        topicName: "Sliding Window Protocols",
        date: "28 May",
        targetDate: "2026-05-28",
        statusColor: "bg-rose-500",
      });
    }

    return tasks;
  };

  const getCounts = () => {
    const total = allTopics.length;
    const completed = completedTopics.length;
    const inProgress = allTopics.filter((t) => !t.completed && (t.notes || (t as any).bookmarked)).length;

    const pending = Math.max(0, total - completed - inProgress);
    return { completed, inProgress, pending, total };
  };

  const handleToggleBookmark = async (unitId: string, topicId: string) => {
    if (!currentSyllabus) return;

    let toggledTopicName = "";
    let isBookmarkedNow = false;
    currentSyllabus.units.forEach((unit) => {
      if (unit.id === unitId) {
        unit.topics.forEach((topic) => {
          if (topic.id === topicId) {
            toggledTopicName = topic.name;
            isBookmarkedNow = !(topic as any).bookmarked;
          }
        });
      }
    });

    if (toggledTopicName) {
      if (isBookmarkedNow) {
        addNotification(
          "Topic Bookmarked ⭐",
          `"${toggledTopicName}" has been added to your bookmarks list for quick access.`,
          "info"
        );
      } else {
        addNotification(
          "Bookmark Removed",
          `"${toggledTopicName}" has been removed from bookmarks.`,
          "info"
        );
      }
    }

    const updatedUnits = currentSyllabus.units.map((unit) => {
      if (unit.id !== unitId) return unit;
      return {
        ...unit,
        topics: unit.topics.map((topic) => {
          if (topic.id !== topicId) return topic;
          return {
            ...topic,
            bookmarked: !(topic as any).bookmarked,
          };
        }),
      };
    });

    const updatedSyllabus: Syllabus = {
      ...currentSyllabus,
      units: updatedUnits,
    };

    setCurrentSyllabus(updatedSyllabus);
    setSyllabuses((prev) => prev.map((s) => (s.id === updatedSyllabus.id ? updatedSyllabus : s)));
    await saveSyllabus(updatedSyllabus);
  };

  const handleToggleUnitBookmark = async (unitId: string) => {
    if (!currentSyllabus) return;

    let toggledUnitName = "";
    let isBookmarkedNow = false;
    currentSyllabus.units.forEach((unit) => {
      if (unit.id === unitId) {
        toggledUnitName = unit.name;
        isBookmarkedNow = !unit.bookmarked;
      }
    });

    if (toggledUnitName) {
      if (isBookmarkedNow) {
        addNotification(
          "Unit Bookmarked ⭐",
          `Unit "${toggledUnitName}" has been added to your bookmarks list.`,
          "info"
        );
      } else {
        addNotification(
          "Unit Bookmark Removed",
          `Unit "${toggledUnitName}" has been removed from bookmarks.`,
          "info"
        );
      }
    }

    const updatedUnits = currentSyllabus.units.map((unit) => {
      if (unit.id !== unitId) return unit;
      return {
        ...unit,
        bookmarked: !unit.bookmarked,
      };
    });

    const updatedSyllabus: Syllabus = {
      ...currentSyllabus,
      units: updatedUnits,
    };

    setCurrentSyllabus(updatedSyllabus);
    setSyllabuses((prev) => prev.map((s) => (s.id === updatedSyllabus.id ? updatedSyllabus : s)));
    await saveSyllabus(updatedSyllabus);
  };

  const renderSidebarNavItems = () => {
    const navItems = [
      { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "checklist", label: "Syllabus Checklist", icon: ListTodo },
      { id: "analytics", label: "Analytics & Progress", icon: LineChart },
      { id: "notes", label: "Study Notes", icon: FileText, badge: currentSyllabus ? (currentSyllabus.keepNotes?.length || 0) : standaloneNotes.length },
      { id: "calendar", label: "Study Calendar", icon: Calendar },
      { id: "vault", label: "PDF Library", icon: FolderArchive },
      { id: "bookmarks", label: "Bookmarks", icon: Star, badge: currentSyllabus ? (currentSyllabus.units.filter(u => u.bookmarked).length + currentSyllabus.units.flatMap(u => u.topics).filter((t: any) => t.bookmarked).length) : 0 },
      { id: "settings", label: "Settings", icon: Settings },
    ];

    return (
      <div className="space-y-1.5 font-sans">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSidebarTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveSidebarTab(item.id as any);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-4 py-2.5 rounded-full text-xs font-semibold transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${isActive
                ? "bg-primary-app text-white border border-primary-app/10 shadow-sm"
                : "text-body-app hover:bg-card-strong-app/70 hover:text-ink-app hover:translate-x-0.5"
                }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 transition-colors ${isActive ? "text-white" : "text-muted-soft-app"}`} />
                <span className={isActive ? "font-bold" : ""}>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-black transition-colors ${isActive
                    ? "bg-white/20 text-white"
                    : "bg-hairline-soft-app text-muted-app"
                    }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Divider and Subject List as per Design System */}
        <div className="my-4 border-t border-hairline-soft-app" />
        <div className="px-4 mb-2 text-[10px] font-bold uppercase tracking-wider text-muted-soft-app">My Subjects</div>
        <div className="space-y-1.5 px-1.5">
          {syllabuses.length === 0 ? (
            <div className="px-3 py-2.5 text-[11px] text-muted-soft-app italic font-sans">No subjects yet</div>
          ) : (
            syllabuses.map((s, idx) => {
              const isSelected = currentSyllabus?.id === s.id;

              // Extract initials for the premium circular badge
              const cleanName = s.subjectName.trim();
              let initials = "";
              const upper = cleanName.toUpperCase();
              if (upper.includes("ELECTROMAGNETIC FIELD") || upper === "ELECTROMAGNETIC") initials = "EM";
              else if (upper.includes("ENGLISH")) initials = "EN";
              else if (upper.includes("MATHEMATICS") || upper.includes("MATH")) initials = "MA";
              else if (upper.includes("CONTROL SYSTEM")) initials = "CS";
              else if (upper.includes("ELECTRICAL MACHINE")) initials = "EI";
              else {
                const parts = cleanName.split(/\s+/);
                if (parts.length >= 2) {
                  initials = (parts[0][0] + parts[1][0]).toUpperCase();
                } else {
                  initials = cleanName.substring(0, 2).toUpperCase();
                }
              }

              // Premium color palettes (soft pastel background, crisp accent text)
              const palettes = [
                {
                  bg: "bg-violet-50/80 dark:bg-violet-950/20",
                  text: "text-violet-600 dark:text-violet-400",
                  border: "border-violet-100/50 dark:border-violet-900/30",
                  activeBg: "bg-violet-100/70 dark:bg-violet-950/40 border-violet-200/50 dark:border-violet-800/40",
                  shadow: "shadow-violet-100/30 dark:shadow-none"
                },
                {
                  bg: "bg-emerald-50/80 dark:bg-emerald-950/20",
                  text: "text-emerald-600 dark:text-emerald-400",
                  border: "border-emerald-100/50 dark:border-emerald-900/30",
                  activeBg: "bg-emerald-100/70 dark:bg-emerald-950/40 border-emerald-200/50 dark:border-emerald-800/40",
                  shadow: "shadow-emerald-100/30 dark:shadow-none"
                },
                {
                  bg: "bg-rose-50/80 dark:bg-rose-950/20",
                  text: "text-rose-600 dark:text-rose-400",
                  border: "border-rose-100/50 dark:border-rose-900/30",
                  activeBg: "bg-rose-100/70 dark:bg-rose-950/40 border-rose-200/50 dark:border-rose-800/40",
                  shadow: "shadow-rose-100/30 dark:shadow-none"
                },
                {
                  bg: "bg-amber-50/80 dark:bg-amber-950/20",
                  text: "text-amber-600 dark:text-amber-400",
                  border: "border-amber-100/50 dark:border-amber-900/30",
                  activeBg: "bg-amber-100/70 dark:bg-amber-950/40 border-amber-200/50 dark:border-amber-800/40",
                  shadow: "shadow-amber-100/30 dark:shadow-none"
                },
                {
                  bg: "bg-indigo-50/80 dark:bg-indigo-950/20",
                  text: "text-indigo-600 dark:text-indigo-400",
                  border: "border-indigo-100/50 dark:border-indigo-900/30",
                  activeBg: "bg-indigo-100/70 dark:bg-indigo-950/40 border-indigo-200/50 dark:border-indigo-800/40",
                  shadow: "shadow-indigo-100/30 dark:shadow-none"
                },
                {
                  bg: "bg-sky-50/80 dark:bg-sky-950/20",
                  text: "text-sky-600 dark:text-sky-400",
                  border: "border-sky-100/50 dark:border-sky-900/30",
                  activeBg: "bg-sky-100/70 dark:bg-sky-950/40 border-sky-200/50 dark:border-sky-800/40",
                  shadow: "shadow-sky-100/30 dark:shadow-none"
                }
              ];
              const p = palettes[idx % palettes.length];

              return (
                <button
                  key={s.id}
                  onClick={() => {
                    setCurrentSyllabus(s);
                    localStorage.setItem("activeSyllabusId", s.id);
                    setActiveSidebarTab("checklist");
                  }}
                  className={`group w-full flex items-center gap-3 px-3 py-2.5 text-xs rounded-xl transition-all duration-200 text-left cursor-pointer outline-hidden ${isSelected
                    ? "bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 text-slate-800 dark:text-slate-100 font-semibold shadow-xs"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/35 hover:text-slate-800 dark:hover:text-slate-200 hover:translate-y-[-1.5px] hover:shadow-xs active:translate-y-0"
                    }`}
                >
                  {/* Premium Circular Badge */}
                  <div
                    className={`w-[30px] h-[30px] rounded-full flex items-center justify-center font-bold text-[10px] tracking-wider shrink-0 border transition-all duration-200 ${isSelected
                      ? `${p.activeBg} ${p.text} scale-105 shadow-xs ${p.shadow}`
                      : `${p.bg} ${p.text} ${p.border} group-hover:scale-105 group-hover:border-slate-300 dark:group-hover:border-slate-700`
                      }`}
                  >
                    {initials}
                  </div>

                  {/* Elegant Truncating Text */}
                  <span className={`truncate font-medium transition-colors duration-200 ${isSelected
                    ? "text-slate-800 dark:text-slate-100 font-semibold"
                    : "text-slate-500 dark:text-slate-400 group-hover:text-slate-800 group-hover:dark:text-slate-200"
                    }`}>
                    {s.subjectName}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Dynamic Sidebar Sign Out Trigger */}
        <div className="mt-6 pt-4 border-t border-hairline-soft-app px-1.5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-full text-xs font-semibold text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transition-all cursor-pointer hover:translate-x-0.5 active:scale-98"
          >
            <LogOut className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{user ? "Sign Out" : "Exit Guest Mode"}</span>
          </button>
        </div>
      </div>
    );
  };

  const renderWeeklyStreakDots = () => {
    const theme = getThemeConfig(primaryColor);
    const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
    const today = new Date();
    const currentDay = today.getDay();
    const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay;

    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);

    return (
      <div className="flex justify-between items-center gap-1.5 mt-3.5">
        {daysOfWeek.map((dayLabel, index) => {
          const checkDate = new Date(monday);
          checkDate.setDate(monday.getDate() + index);
          const dateStr = checkDate.toISOString().split("T")[0];

          const hasCompletedOnDay = allTopics.some(
            (t) => t.completed && t.completedAt && t.completedAt.startsWith(dateStr)
          );
          const isCheckDayToday = today.toDateString() === checkDate.toDateString();

          return (
            <div key={index} className="flex flex-col items-center gap-1">
              <span className={`text-[9px] font-black tracking-wider ${isCheckDayToday ? `${theme.text} font-bold` : "text-slate-400"}`}>
                {dayLabel}
              </span>
              <div
                className={`w-2.5 h-2.5 rounded-full transition-all ${hasCompletedOnDay
                  ? `${theme.bg} shadow-sm ${theme.shadow}`
                  : isCheckDayToday
                    ? `border-2 ${theme.borderPrimary}`
                    : "bg-slate-200 dark:bg-slate-800"
                  }`}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const theme = getThemeConfig(primaryColor);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center font-sans p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center p-1 shadow-2xl shadow-primary-app/20 animate-pulse">
            <img src="/nocus-logo.png" alt="nocus logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col items-center leading-none gap-0.5">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary-app font-mono">beta</span>
            <span className="font-sans text-xl font-black tracking-tight text-ink-app">nocus</span>
          </div>
          <div className="flex items-center gap-2 bg-card-app/60 px-3.5 py-1.5 rounded-full border border-hairline-soft-app mt-2">
            <Loader2 className="w-3.5 h-3.5 text-primary-app animate-spin" />
            <span className="text-[10px] font-bold text-muted-app uppercase tracking-widest">Loading nocus...</span>
          </div>
          <button
            onClick={() => {
              setGuestMode(true);
              localStorage.setItem("meridian_guest_mode", "true");
              localStorage.setItem("nocus_guest_mode", "true");
            }}
            className="mt-2 px-4 py-2 text-xs font-semibold text-muted-app hover:text-white bg-card-app/80 border border-hairline-soft-app rounded-full cursor-pointer transition-all hover:border-primary-app select-none"
          >
            Continue in Guest Mode →
          </button>
        </div>
      </div>
    );
  }

  if (!user && !guestMode) {
    return (
      <AuthView
        onGuestMode={() => {
          setGuestMode(true);
          localStorage.setItem("meridian_guest_mode", "true");
          localStorage.setItem("nocus_guest_mode", "true");
        }}
        primaryColor={primaryColor}
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg-app text-body-app flex transition-colors duration-300 font-sans">
      {/* 1. Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 w-60 bg-bg-app flex flex-col hidden lg:flex select-none border-r border-hairline-soft-app">
        {/* Brand Header */}
        <div className="h-24 flex items-center gap-3 px-6 shrink-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-md shadow-primary-app/20 p-0.5">
            <img src="/nocus-logo.png" alt="nocus logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col justify-center leading-none">
            <span className="text-[9px] font-extrabold uppercase tracking-widest text-primary-app font-mono leading-none mb-1 select-none">
              beta
            </span>
            <span className="font-sans text-xl font-black tracking-tight text-ink-app leading-none">
              nocus
            </span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {renderSidebarNavItems()}
        </nav>

        {/* Sidebar Footer with Streak Badge & Profile */}
        <div className="p-4.5 border-t border-hairline-soft-app bg-transparent space-y-4">
          <div className="p-3 bg-card-app/60 border border-hairline-soft-app rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1">
                <span className="text-xs">🔥</span>
                <span className="text-xs font-black text-ink-app">{currentSyllabus?.streak || 0} Days</span>
              </div>
              <div className="text-[9px] font-bold uppercase text-muted-soft-app tracking-wider leading-none">Daily Streak</div>
            </div>
            <button
              onClick={() => setAvatarModalOpen(true)}
              className="w-8.5 h-8.5 rounded-full overflow-hidden border border-primary-app/20 relative cursor-pointer hover:opacity-80 transition-all flex items-center justify-center bg-primary-soft-app/20 shrink-0"
              title="Change Profile Avatar"
            >
              {customAvatar ? (
                <img src={customAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : user?.user_metadata?.avatar_url ? (
                <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full bg-primary-soft-app text-primary-app flex items-center justify-center font-bold text-xs">
                  {(user?.user_metadata?.full_name || guestName).charAt(0).toUpperCase()}
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* 2. Mobile Sidebar Drawer Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="absolute inset-0 bg-[#1C1A17]/40 backdrop-blur-xs"
            />

            {/* Sidebar content panel */}
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              className="absolute inset-y-0 left-0 w-60 bg-bg-app flex flex-col p-4 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-4 border-b border-hairline-soft-app">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center overflow-hidden shrink-0 shadow-sm p-0.5">
                    <img src="/nocus-logo.png" alt="nocus logo" className="w-full h-full object-contain" />
                  </div>
                  <div className="flex flex-col justify-center leading-none">
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-primary-app font-mono leading-none mb-0.5">
                      beta
                    </span>
                    <span className="font-sans text-lg font-black tracking-tight text-ink-app leading-none">
                      nocus
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1.5 rounded-full hover:bg-card-app text-muted-app hover:text-ink-app cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
                {renderSidebarNavItems()}
              </nav>

              <div className="p-4 border-t border-hairline-soft-app flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-card-app flex items-center justify-center">
                    <Flame className="w-4 h-4 text-primary-app animate-pulse" />
                  </div>
                  <div>
                    <div className="text-[9px] uppercase font-bold text-muted-soft-app tracking-wide leading-none">Daily Streak</div>
                    <div className="text-xs font-serif font-bold text-ink-app mt-0.5">{currentSyllabus?.streak || 0} Days</div>
                  </div>
                </div>
                <button
                  onClick={() => setAvatarModalOpen(true)}
                  className="w-8 h-8 rounded-full overflow-hidden border border-hairline-app relative cursor-pointer"
                >
                  {customAvatar ? (
                    <img src={customAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : user?.user_metadata?.avatar_url ? (
                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-primary-soft-app text-primary-app flex items-center justify-center font-bold text-xs">
                      {(user?.user_metadata?.full_name || guestName).charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen lg:pl-60">
        {/* Top Header Row (Navbar) */}
        <header className="sticky top-0 z-30 h-16 bg-[var(--bg)] border-b border-[var(--border)] px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 relative transition-colors duration-200">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0" ref={headerDropdownRef}>
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl border border-hairline-app text-muted-app hover:bg-card-app cursor-pointer"
            >
              <Menu className="w-4.5 h-4.5" />
            </button>

            {/* Global Subject Switcher Dropdown in Top Header - Isolated and Visible Everywhere */}
            {currentSyllabus && (
              <div className="relative">
                <button
                  onClick={() => {
                    setHeaderDropdownOpen(!headerDropdownOpen);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 sm:px-3.5 sm:py-1.5 bg-card-app/90 hover:bg-card-strong-app/90 border border-hairline-app rounded-full text-xs font-bold transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${headerDropdownOpen ? `ring-2 ${theme.ring} ${theme.borderPrimary}` : ""
                    }`}
                  title={syllabuses.length > 1 ? "Switch Active Subject" : "Subject Workspace"}
                >
                  <div className="max-w-[120px] sm:max-w-[140px] overflow-hidden whitespace-nowrap text-ink-app font-sans relative flex items-center">
                    <div className="animate-marquee hover:[animation-play-state:paused] flex gap-4 pr-4 shrink-0">
                      <span>{currentSyllabus.subjectName}</span>
                      <span>{currentSyllabus.subjectName}</span>
                    </div>
                  </div>

                  {/* Indicator showing subjects can be switched */}
                  <div className="flex items-center gap-0.5 ml-0.5 shrink-0">
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-200 ${headerDropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                </button>

                {/* Dropdown Menu */}
                {headerDropdownOpen && (
                  <div className="absolute left-0 mt-2.5 w-64 bg-surface-app border border-hairline-app rounded-2xl shadow-2xl py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="px-3.5 py-2 border-b border-hairline-soft-app flex items-center justify-between">
                      <p className="text-[10px] font-extrabold text-muted-soft-app uppercase tracking-wider">
                        Select Subject
                      </p>
                      <span className={`text-[9px] font-bold ${theme.badge} px-2 py-0.5 rounded-full`}>
                        {syllabuses.length} {syllabuses.length === 1 ? "Subject" : "Subjects"}
                      </span>
                    </div>
                    <div className="max-h-56 overflow-y-auto py-1 scrollbar-thin">
                      {syllabuses.map((s) => {
                        const isSelected = s.id === currentSyllabus.id;
                        const sTopics = s.units?.flatMap(u => u.topics) || [];
                        const sCompleted = sTopics.filter(t => t.completed).length;
                        const sPct = sTopics.length > 0 ? Math.round((sCompleted / sTopics.length) * 100) : 0;

                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setCurrentSyllabus(s);
                              localStorage.setItem("activeSyllabusId", s.id);
                              setHeaderDropdownOpen(false);
                              addNotification(
                                "Subject Changed! 🔄",
                                `Switched active subject to "${s.subjectName}".`,
                                "info"
                              );
                            }}
                            className={`w-full text-left px-3.5 py-2 hover:bg-card-app/60 flex items-center justify-between gap-3 transition-colors cursor-pointer ${isSelected ? "bg-card-app/30" : ""
                              }`}
                          >
                            <div className="min-w-0 flex-1">
                              <p className={`text-xs font-bold truncate ${isSelected ? `${theme.text}` : "text-ink-app"
                                }`}>
                                {s.subjectName}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-1 bg-card-app rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full bg-gradient-to-r ${theme.gradient}`}
                                    style={{ width: `${sPct}%` }}
                                  />
                                </div>
                                <span className="text-[9px] font-medium text-muted-app">{sPct}% done</span>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className={`w-3.5 h-3.5 ${theme.text} shrink-0`} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Dropdown Bottom Option: + Add New Subject */}
                    <div className="p-1.5 border-t border-hairline-soft-app bg-card-app/30">
                      <button
                        type="button"
                        onClick={() => {
                          setHeaderDropdownOpen(false);
                          setIsAddingCourse(true);
                        }}
                        className="w-full py-1.5 px-3 text-xs font-bold text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add New Subject</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 sm:gap-4 shrink-0">
            {/* Parsing/Processing Syllabus Indicator */}
            {uploadState.loading && (
              <span className="text-[11px] font-bold text-violet-500 dark:text-violet-400 flex items-center justify-center bg-violet-500/10 dark:bg-violet-500/20 p-2 rounded-xl border border-violet-500/15 select-none" title="Processing Syllabus...">
                <Loader2 className="w-4 h-4 animate-spin" />
              </span>
            )}



            {/* Dark Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:border-[var(--accent)] hover:text-[var(--text)] cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 shadow-xs"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Bell Indicator */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className={`p-2 rounded-xl border cursor-pointer relative transition-all duration-200 hover:scale-105 active:scale-95 bg-[var(--surface)] text-[var(--text)] shadow-xs ${
                  notificationsOpen
                    ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                    : "border-[var(--border)] hover:border-[var(--accent)]"
                }`}
                title="Notifications"
              >
                <Bell className={`w-4 h-4 transition-transform duration-300 ${notificationsOpen ? "scale-110 rotate-12" : ""}`} />
                {notifications.some((n) => !n.read) && (
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--surface)] animate-pulse" />
                )}
              </button>

              <AnimatePresence>
                {notificationsOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="fixed sm:absolute top-16 sm:top-auto left-4 right-4 sm:left-auto sm:right-0 mt-3 sm:w-96 bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right max-w-full sm:max-w-none"
                  >
                    {/* Header */}
                    <div className="px-4 py-3 border-b border-slate-150 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                          Notifications
                        </span>
                        {notifications.filter((n) => !n.read).length > 0 && (
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full ${theme.badge}`}>
                            {notifications.filter((n) => !n.read).length} new
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {notifications.length > 0 && (
                          <button
                            onClick={clearAllNotifications}
                            className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            Clear all
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Notification List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-150 dark:divide-slate-800/40">
                      {notifications.length > 0 ? (
                        notifications.map((notif) => (
                          <div
                            key={notif.id}
                            onClick={() => markNotificationAsRead(notif.id)}
                            className={`p-4 transition-colors cursor-pointer relative group flex gap-3 ${notif.read
                              ? "hover:bg-slate-50/60 dark:hover:bg-slate-900/20"
                              : `${theme.badge} hover:brightness-95`
                              }`}
                          >
                            {/* Unread indicator dot */}
                            {!notif.read && (
                              <span className={`absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full ${theme.bg}`} />
                            )}

                            {/* Type Icon */}
                            <div className="shrink-0 mt-0.5">
                              {notif.type === "success" ? (
                                <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </div>
                              ) : notif.type === "warning" ? (
                                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-500">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                </div>
                              ) : (
                                <div className={`p-1.5 rounded-lg ${theme.badge}`}>
                                  <Sparkles className="w-3.5 h-3.5" />
                                </div>
                              )}
                            </div>

                            {/* Message Body */}
                            <div className="flex-1 min-w-0 pr-4">
                              <h4 className={`text-xs font-bold truncate ${notif.read ? "text-slate-800 dark:text-slate-200" : "text-slate-950 dark:text-white"
                                }`}>
                                {notif.title}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed break-words">
                                {notif.message}
                              </p>
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-1 block">
                                {formatRelativeTime(notif.timestamp)}
                              </span>
                            </div>

                            {/* Individual Delete Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                clearNotification(notif.id);
                              }}
                              className="absolute right-3 top-3 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
                              title="Clear notification"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400 dark:text-slate-600 mb-3 border border-slate-100 dark:border-slate-800">
                            <Bell className="w-6 h-6 stroke-1.25" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            No notifications yet
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                            We'll ping you here when you complete study milestones!
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Recent Activity Shortcut */}
            <div className="relative" ref={activityDropdownRef}>
              <button
                onClick={() => setActivityDropdownOpen(!activityDropdownOpen)}
                className={`p-2 rounded-xl border cursor-pointer relative transition-all duration-200 hover:scale-105 active:scale-95 bg-[var(--surface)] text-[var(--text)] shadow-xs ${
                  activityDropdownOpen
                    ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                    : "border-[var(--border)] hover:border-[var(--accent)]"
                }`}
                title="Recent Activity"
              >
                <History className={`w-4 h-4 transition-transform duration-300 ${activityDropdownOpen ? "scale-110 rotate-12" : ""}`} />
              </button>

              <AnimatePresence>
                {activityDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className="fixed sm:absolute top-16 sm:top-auto left-4 right-4 sm:left-auto sm:right-0 mt-3 sm:w-96 bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50 origin-top-right max-w-full sm:max-w-none"
                  >
                    {/* Header */}
                    <div className="px-4 py-2 border-b border-slate-150 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-start">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-primary-app" />
                        <span className="font-bold text-xs text-slate-900 dark:text-white uppercase tracking-wider">
                          Recent Activity
                        </span>
                      </div>
                    </div>

                    {/* Activity Feed List */}
                    <div className="max-h-80 overflow-y-auto divide-y divide-slate-150 dark:divide-slate-800/40">
                      {getRecentActivities().length > 0 ? (
                        getRecentActivities().slice(0, 8).map((act) => {
                          let iconBg = "bg-status-complete-bg-app text-status-complete-app";
                          if (act.type === "note") {
                            iconBg = "bg-status-due-soon-bg-app text-status-due-soon-app";
                          } else if (act.type === "started") {
                            iconBg = "bg-primary-soft-app/20 text-primary-app";
                          }

                          return (
                            <div key={act.id} className="p-4 flex items-start gap-3.5 hover:bg-slate-50/60 dark:hover:bg-slate-900/20 transition-colors">
                              <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                                {act.type === "note" ? (
                                  <FileText className="w-4 h-4" />
                                ) : (
                                  <CheckCircle2 className="w-4 h-4" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0 flex flex-col justify-between">
                                <div className="w-full">
                                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 whitespace-normal break-normal leading-relaxed">
                                    {act.title}
                                  </p>
                                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold whitespace-normal break-normal mt-1 leading-relaxed">
                                    {act.detail}
                                  </p>
                                </div>

                                <div className="flex items-center justify-end gap-3 mt-2 shrink-0 self-end">
                                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 whitespace-nowrap">
                                    {act.time}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="py-12 px-4 flex flex-col items-center justify-center text-center">
                          <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl text-slate-400 dark:text-slate-600 mb-3 border border-slate-100 dark:border-slate-800">
                            <History className="w-6 h-6 stroke-1.25" />
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            No recent activity
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                            Your completed or updated study tasks will show up here instantly!
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Profile Caps / Actions */}
            <div className="hidden sm:flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              {authLoading ? (
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
              ) : user ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAvatarModalOpen(true)}
                    className="relative block w-8 h-8 rounded-full overflow-hidden cursor-pointer group/header-avatar transition-transform duration-200 hover:scale-105 active:scale-95 focus:outline-hidden"
                    title="Change Profile Avatar"
                  >
                    {customAvatar ? (
                      <img src={customAvatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className={`w-full h-full bg-gradient-to-r ${theme.gradient} text-white flex items-center justify-center font-bold text-xs`}>
                        {user.user_metadata?.full_name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    )}

                    {/* Header Hover Overlay */}
                    <div className="absolute inset-0 bg-black/45 flex items-center justify-center opacity-0 group-hover/header-avatar:opacity-100 transition-opacity duration-200">
                      <Camera className="w-3 h-3 text-white" />
                    </div>
                  </button>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-350">{user.user_metadata?.full_name || "Learner"}</span>
                </div>
              ) : (
                <button
                  onClick={handleLogin}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[var(--accent)] text-white hover:brightness-110 font-extrabold text-xs cursor-pointer shadow-md shadow-[var(--accent-glow)] hover:scale-105 active:scale-95 transition-all border-0"
                >
                  <LogIn className="w-3.5 h-3.5 text-white" />
                  <span>Sync</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic View Main Box */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 lg:pb-8">
          {isAddingCourse ? (
            <div className="max-w-3xl mx-auto space-y-6">
              <button
                onClick={() => setIsAddingCourse(false)}
                className="flex items-center gap-1.5 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text)] transition-all duration-150 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] px-3.5 py-2 rounded-full shadow-sm cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              >
                ← Back to Dashboard
              </button>
              <div className="text-center py-4">
                <div className="inline-flex p-4 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border)] mb-4 animate-bounce">
                  <GraduationCap className="w-8 h-8" />
                </div>
                <h1 className="text-3xl font-black text-[var(--text)] font-serif tracking-tight">
                  Track a New Subject
                </h1>
                <p className="mt-2 text-sm text-[var(--text-muted)] max-w-lg mx-auto font-sans leading-relaxed">
                  Load another syllabus to track multiple subjects or classes concurrently in your active dashboard.
                </p>
              </div>

              <SyllabusUpload
                onSyllabusParsed={handleSyllabusParsed}
                uploadState={uploadState}
                setUploadState={setUploadState}
                onProcessFile={handleProcessFile}
                onProcessText={handleProcessText}
                onScanImages={handleScanImages}
              />
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {(() => {
                if (!currentSyllabus && activeSidebarTab === "dashboard") {
                  return (
                    <motion.div
                      key="upload-landing"
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ duration: 0.2 }}
                      className="max-w-3xl mx-auto space-y-6"
                    >
                      <div className="text-center py-8">
                        <div className="inline-flex p-4 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border)] mb-4 animate-bounce">
                          <GraduationCap className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-black text-[var(--text)] font-serif tracking-tight">
                          AI Syllabus Tracker & Planner
                        </h1>
                        <p className="mt-2 text-sm text-[var(--text-muted)] max-w-lg mx-auto font-sans leading-relaxed">
                          Transform any messy subject syllabus or syllabus text into an actionable study checklist instantly. Set goals, count down to exams, and build learning habits.
                        </p>
                      </div>

                      <SyllabusUpload
                        onSyllabusParsed={handleSyllabusParsed}
                        uploadState={uploadState}
                        setUploadState={setUploadState}
                        onProcessFile={handleProcessFile}
                        onProcessText={handleProcessText}
                        onScanImages={handleScanImages}
                      />

                      {!user && (
                        <div className="p-4 bg-[var(--accent-soft)] text-[var(--text)] text-xs rounded-2xl border border-[var(--accent)] text-center max-w-lg mx-auto transition-colors">
                          💡 <strong>Guest Mode:</strong> Your data is saved locally on this browser.{" "}
                          <button onClick={handleLogin} className="underline font-bold text-[var(--accent)] hover:brightness-125 cursor-pointer transition-all">
                            Sign in with Google
                          </button>{" "}
                          to securely back up your data to the cloud.
                        </div>
                      )}
                    </motion.div>
                  );
                }

                switch (activeSidebarTab) {
                  case "dashboard": {
                    const counts = getCounts();
                    const recentActivities = getRecentActivities();
                    const upcomingTasks = getUpcomingTasks();
                    const currentPercent = counts.total > 0 ? Math.round((counts.completed / counts.total) * 100) : 0;

                    return (
                      <motion.div
                        key="dashboard-view"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                      >
                        <DashboardView
                          syllabus={currentSyllabus}
                          syllabuses={syllabuses}
                          onSelectSyllabus={(id) => {
                            const found = syllabuses.find(s => s.id === id);
                            if (found) {
                              setCurrentSyllabus(found);
                              localStorage.setItem("activeSyllabusId", found.id);
                            }
                          }}
                          onAddCourse={() => setIsAddingCourse(true)}
                          user={user}
                          guestName={guestName}
                          onNavigate={(tab) => setActiveSidebarTab(tab as any)}
                          completedCount={counts.completed}
                          inProgressCount={counts.inProgress}
                          pendingCount={counts.pending}
                          totalCount={counts.total}
                          recentActivities={recentActivities}
                          onToggleTopic={handleToggleTopic}
                          upcomingTasks={upcomingTasks}
                          primaryColor={primaryColor}
                          onUpdateTopicAndUnit={handleUpdateTopicAndUnit}
                          onUndoActivity={handleUndoTopicCompletion}
                          onDeleteSyllabus={handleDeleteSyllabus}
                        />
                      </motion.div>
                    );
                  }

                  case "checklist":
                    return (
                      <motion.div
                        key="checklist-view"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                      >
                        {/* Subject Overview Row */}
                        {currentSyllabus && (
                          <div className="bg-surface-app border border-hairline-soft-app p-5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                              <div className="text-[10px] font-bold text-muted-soft-app uppercase tracking-wider">
                                Currently Viewing Checklist
                              </div>
                              <h1 className="text-xl font-bold text-ink-app font-serif tracking-tight mt-0.5">
                                {currentSyllabus.subjectName}
                              </h1>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                onClick={handleResetSyllabus}
                                className="px-3.5 py-1.5 bg-card-app hover:bg-opacity-85 text-ink-app font-semibold text-xs rounded-full border border-hairline-app flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset Progress
                              </button>
                            </div>
                          </div>
                        )}

                        <SyllabusChecklist
                          syllabus={currentSyllabus}
                          onToggleTopic={handleToggleTopic}
                          onUpdateTopicNotes={handleUpdateTopicNotes}
                          onToggleBookmark={handleToggleBookmark}
                          onToggleUnitBookmark={handleToggleUnitBookmark}
                        />
                      </motion.div>
                    );

                  case "notes":
                    return (
                      <motion.div
                        key="notes-view"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                      >
                        <KeepNotes
                          notes={currentSyllabus ? (currentSyllabus.keepNotes || []) : standaloneNotes}
                          onAddNote={handleKeepAddNote}
                          onUpdateNote={handleKeepUpdateNote}
                          onDeleteNote={handleKeepDeleteNote}
                        />
                      </motion.div>
                    );

                  case "analytics":
                    return (
                      <motion.div
                        key="analytics-view"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                        className="space-y-6"
                      >
                        <ProgressStats
                          syllabus={currentSyllabus}
                          completedCount={completedTopics.length}
                          totalTopicsCount={allTopics.length}
                          completedTodayCount={completedTodayList.length}
                          onUpdateExamDate={handleUpdateExamDate}
                          onUpdateDailyTarget={handleUpdateDailyTarget}
                          onToggleTopic={handleToggleTopic}
                          onUpdatePlannedTopics={handleUpdatePlannedTopics}
                          primaryColor={primaryColor}
                          onAddCourse={() => {
                            setActiveSidebarTab("dashboard");
                            setIsAddingCourse(true);
                          }}
                        />
                        <ProgressCharts syllabus={currentSyllabus} />
                      </motion.div>
                    );

                  case "calendar":
                    return (
                      <motion.div
                        key="calendar-view"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                      >
                        <StudyCalendar
                          syllabus={currentSyllabus}
                          onUpdateExamDate={handleUpdateExamDate}
                        />
                      </motion.div>
                    );

                  case "bookmarks": {
                    const bookmarkedTopics: Array<{
                      unitId: string;
                      unitName: string;
                      topic: Topic;
                    }> = [];
                    if (currentSyllabus) {
                      currentSyllabus.units.forEach((unit) => {
                        unit.topics.forEach((topic) => {
                          if ((topic as any).bookmarked) {
                            bookmarkedTopics.push({
                              unitId: unit.id,
                              unitName: unit.name,
                              topic,
                            });
                          }
                        });
                      });
                    }

                    return (
                      <motion.div
                        key="bookmarks-view"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                      >
                        <BookmarksView
                          syllabus={currentSyllabus}
                          onToggleTopic={handleToggleTopic}
                          onToggleBookmark={handleToggleBookmark}
                          onToggleUnitBookmark={handleToggleUnitBookmark}
                        />
                      </motion.div>
                    );
                  }

                  case "vault":
                    return (
                      <motion.div
                        key="vault-view"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                      >
                        <VaultView user={user} />
                      </motion.div>
                    );

                  case "settings":
                    return (
                      <motion.div
                        key="settings-view"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                      >
                        <AccountSettings
                          user={user}
                          syllabuses={syllabuses}
                          onBack={() => setActiveSidebarTab("dashboard")}
                          onLogin={handleLogin}
                          onLogout={handleLogout}
                          onResetAllData={handleResetAllData}
                          onImportData={handleImportData}
                          guestName={guestName}
                          onUpdateGuestName={handleUpdateGuestName}
                          weeklyTarget={weeklyTarget}
                          onUpdateWeeklyTarget={handleUpdateWeeklyTarget}
                          primaryColor={primaryColor}
                          onUpdatePrimaryColor={handleUpdatePrimaryColor}
                          darkMode={darkMode}
                          onToggleDarkMode={toggleDarkMode}
                          customAvatar={customAvatar}
                          onUpdateCustomAvatar={handleUpdateCustomAvatar}
                          onTriggerCloudBackup={handleTriggerCloudBackup}
                          themeStyle={themeStyle}
                          onUpdateThemeStyle={handleUpdateThemeStyle}
                        />
                      </motion.div>
                    );

                  case "help":
                    return (
                      <motion.div
                        key="help-view"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.2 }}
                      >
                        <HelpSupportView />
                      </motion.div>
                    );

                  default:
                    return null;
                }
              })()}
            </AnimatePresence>
          )}
        </main>
      </div>

      {/* 4. Custom Accessible Confirmation Modal */}
      <AnimatePresence>
        {confirmModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-5 z-10"
            >
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white font-display">
                  {confirmModal.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`px-5 py-2 text-xs font-bold text-white rounded-full transition-all shadow-sm ${confirmModal.type === "danger"
                    ? "bg-rose-600 hover:bg-rose-700 shadow-rose-500/10"
                    : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/10"
                    }`}
                >
                  {confirmModal.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 5. Custom Auth Error Modal */}
      <AnimatePresence>
        {authError && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAuthError(null)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-5 z-10"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-500 dark:text-amber-400 rounded-2xl border border-amber-500/10">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-display">
                    Sign-In Interrupted
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {authError}
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setAuthError(null)}
                  className="px-4.5 py-2.5 sm:py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-center"
                >
                  Continue in Guest Mode
                </button>
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setAuthError(null)}
                  className="px-5 py-2.5 sm:py-2 text-xs font-bold text-white bg-primary-app hover:bg-primary-active-app rounded-full transition-all shadow-sm shadow-primary-app/15 flex items-center justify-center gap-1.5 text-center"
                >
                  <CloudLightning className="w-3.5 h-3.5" />
                  Open in New Tab
                </a>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. Profile Avatar Customizer Modal */}
      <AnimatePresence>
        {avatarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAvatarModalOpen(false)}
              className="absolute inset-0 bg-slate-950/45 backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-[#111625] shadow-2xl z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-slate-150 dark:border-slate-800/40">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 bg-gradient-to-br ${theme.gradient} text-white rounded-xl`}>
                    <Camera className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white font-display uppercase tracking-wider">
                      Customize Profile Avatar
                    </h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                      Upload an image, generate with AI, or pick an abstract mesh
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAvatarModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs selector */}
              <div className="flex border-b border-slate-100 dark:border-slate-800/30 px-5 pt-3 gap-2 bg-slate-50/50 dark:bg-slate-900/10">
                {(["upload", "ai", "abstract"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setAvatarTab(tab);
                      setAvatarGenerationError("");
                    }}
                    className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 relative cursor-pointer ${avatarTab === tab
                      ? `${theme.text} ${theme.borderPrimary}`
                      : "text-slate-400 dark:text-slate-500 border-transparent hover:text-slate-600"
                      }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {tab === "upload" && <Upload className="w-3.5 h-3.5" />}
                      {tab === "ai" && <Sparkles className="w-3.5 h-3.5" />}
                      {tab === "abstract" && <Palette className="w-3.5 h-3.5" />}
                      <span className="capitalize">{tab === "upload" ? "Upload Photo" : tab === "ai" ? "AI Generator" : "Abstract"}</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Content Panel */}
              <div className="p-6">
                {avatarTab === "upload" && (
                  <div className="space-y-4">
                    {/* File Upload Zone */}
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragActive(true);
                      }}
                      onDragLeave={() => setDragActive(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragActive(false);
                        if (e.dataTransfer.files?.[0]) {
                          handleAvatarFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => document.getElementById("avatar-file-input")?.click()}
                      className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer group ${dragActive
                        ? `${theme.borderPrimary} bg-slate-50 dark:bg-slate-900/30`
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/5"
                        }`}
                    >
                      <div className={`p-3 rounded-full bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 text-slate-400 group-hover:text-primary-app group-hover:scale-110 transition-all duration-300 ${theme.shadow}`}>
                        <Upload className="w-6 h-6 animate-pulse" />
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs font-black text-slate-800 dark:text-white">
                          Drag & drop image here or <span className={theme.text}>browse</span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                          Supports JPG, PNG, GIF, SVG up to 5MB
                        </p>
                      </div>
                      <input
                        id="avatar-file-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files?.[0]) {
                            handleAvatarFile(e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {avatarTab === "ai" && (
                  <div className="space-y-4.5">
                    {/* Prompt input field */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Describe Your Desired Avatar
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={avatarPrompt}
                          onChange={(e) => setAvatarPrompt(e.target.value)}
                          placeholder="e.g. A cute study panda with big round glasses reading a chemistry book"
                          disabled={generatingAvatar}
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 focus:outline-hidden focus:ring-2 focus:ring-primary-app/20 text-xs font-bold text-slate-800 dark:text-white"
                        />
                        <div className="absolute right-2.5 top-2 flex items-center gap-1.5">
                          {avatarPrompt && (
                            <button
                              onClick={() => setAvatarPrompt("")}
                              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded-md"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick suggestions */}
                    <div className="space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        Try these ideas:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "Graduation Bear",
                          "Tech coder avatar",
                          "Abstract geometric spiral",
                          "Retro computer screen",
                          "Chemistry flask logo",
                        ].map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setAvatarPrompt(suggestion)}
                            disabled={generatingAvatar}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:border-slate-350 dark:hover:border-slate-700 cursor-pointer"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>

                    {avatarGenerationError && (
                      <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-500/15 flex items-start gap-2.5 text-xs font-bold leading-normal">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{avatarGenerationError}</span>
                      </div>
                    )}

                    <button
                      onClick={handleGenerateAIAvatar}
                      disabled={generatingAvatar}
                      className={`w-full py-3 rounded-2xl text-xs font-bold text-white shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all ${generatingAvatar
                        ? "bg-slate-400 dark:bg-slate-700 cursor-not-allowed opacity-80"
                        : `bg-gradient-to-r ${theme.gradient} ${theme.shadow} hover:opacity-95`
                        }`}
                    >
                      {generatingAvatar ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Generating Vector SVG Art...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Generate Avatar with Gemini AI</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {avatarTab === "abstract" && (
                  <div className="space-y-4.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                      Curated Procedural Palettes
                    </span>
                    <div className="grid grid-cols-2 gap-3.5">
                      {abstractPalettes.map((palette) => (
                        <button
                          key={palette.name}
                          onClick={() => handleGenerateAbstractAvatar(palette.colors)}
                          className="p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-350 dark:hover:border-slate-700 flex flex-col gap-2.5 items-start text-left cursor-pointer group transition-all duration-200"
                        >
                          <div className="flex gap-1.5">
                            {palette.colors.map((color, idx) => (
                              <div
                                key={idx}
                                className="w-4 h-4 rounded-full border border-white/20"
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-800 dark:text-white block">
                              {palette.name}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                              Generate Geometric Gradient
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between p-5 border-t border-slate-150 dark:border-slate-800/40 bg-slate-50/50 dark:bg-slate-900/10">
                <button
                  onClick={() => {
                    handleUpdateCustomAvatar("");
                    setAvatarModalOpen(false);
                  }}
                  className="px-4 py-2 text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors cursor-pointer"
                >
                  Reset to Default
                </button>
                <button
                  onClick={() => setAvatarModalOpen(false)}
                  className="px-5 py-2 text-xs font-bold text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Splash Screen & Welcome Tour Modals */}
      <AnimatePresence>
        {showSplash && (
          <motion.div
            key="splash-screen"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="fixed inset-0 bg-slate-900/98 dark:bg-slate-950/99 z-[9999] flex flex-col items-center justify-center text-white"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="text-center flex flex-col items-center"
            >
              <div className={`w-16 h-16 rounded-3xl bg-gradient-to-tr ${theme.gradient || "from-violet-600 to-fuchsia-600"} flex items-center justify-center text-white font-black text-2xl shadow-2xl mb-6`}>
                S
              </div>
              <h1 className="text-3xl md:text-4xl font-black font-display tracking-tight text-white mb-2">
                Syllabus Tracker
              </h1>
              <p className="text-slate-400 font-medium text-xs md:text-sm tracking-wide mb-8">
                Organize • Plan • Master
              </p>

              {/* Subtle loading animation */}
              <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ left: "-100%" }}
                  animate={{ left: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  className={`absolute top-0 bottom-0 w-1/2 bg-gradient-to-r ${theme.gradient || "from-violet-500 to-fuchsia-500"} rounded-full`}
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {showTour && (
          <div key="tour-modal-overlay" className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/85 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white dark:bg-[#111625] border border-slate-200 dark:border-white/[0.08] rounded-3xl shadow-2xl overflow-hidden flex flex-col w-11/12 md:w-2/3 lg:max-w-lg"
            >
              {/* Top colored accent line */}
              <div className={`h-1.5 bg-gradient-to-r ${theme.gradient || "from-violet-500 to-fuchsia-500"}`} />

              {/* Step content */}
              <div className="p-6 md:p-8 flex-1 flex flex-col items-center text-center">
                {/* Step Indicators */}
                <div className="flex gap-2 mb-6">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`h-1.5 rounded-full transition-all duration-300 ${tourStep === step
                        ? `w-8 ${theme.bg || "bg-violet-600"}`
                        : "w-2 bg-slate-200 dark:bg-slate-800"
                        }`}
                    />
                  ))}
                </div>

                <AnimatePresence mode="wait">
                  {tourStep === 1 && (
                    <motion.div
                      key="tour-step-1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-6 border border-violet-200 dark:border-violet-900/50 shadow-xs">
                        <GraduationCap className="w-8 h-8" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white font-display tracking-tight mb-2">
                        Welcome to Syllabus Tracker!
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm">
                        Transform messy subject outlines, PDF syllabuses, or raw curriculum text into beautiful, structured, and interactive study checklists instantly. Set custom goals, track streaks, and master your classes.
                      </p>
                    </motion.div>
                  )}

                  {tourStep === 2 && (
                    <motion.div
                      key="tour-step-2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 border border-emerald-200 dark:border-emerald-900/50 shadow-xs">
                        <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white font-display tracking-tight mb-2">
                        Track your Progress
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm">
                        Check off subtopics as you complete them, star or bookmark key units to study them later, and watch your visual progress charts grow. Dynamic habit metrics keep your daily streak alive!
                      </p>
                    </motion.div>
                  )}

                  {tourStep === 3 && (
                    <motion.div
                      key="tour-step-3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-6 border border-amber-200 dark:border-amber-900/50 shadow-xs">
                        <Calendar className="w-8 h-8" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-black text-slate-800 dark:text-white font-display tracking-tight mb-2">
                        Never miss a deadline
                      </h2>
                      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed max-w-sm">
                        Plan ahead! Set target due dates for important assignments or exams, synchronize study events with your calendar view, and write custom research notes alongside your checklist in real-time.
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Footer buttons with touch targets at least 44px (h-11 is 44px) */}
              <div className="px-6 py-5 bg-slate-50/50 dark:bg-slate-900/10 border-t border-slate-150 dark:border-slate-800/40 flex items-center justify-between gap-3">
                {tourStep > 1 ? (
                  <button
                    onClick={() => setTourStep(tourStep - 1)}
                    className="h-11 px-5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-900 active:scale-95 transition-all cursor-pointer min-w-[80px]"
                  >
                    Back
                  </button>
                ) : (
                  <button
                    onClick={handleCompleteTour}
                    className="h-11 px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                  >
                    Skip Tour
                  </button>
                )}

                <div className="flex gap-2">
                  {tourStep < 3 ? (
                    <>
                      <button
                        onClick={handleCompleteTour}
                        className="h-11 px-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-bold text-xs active:scale-95 transition-all cursor-pointer hidden sm:block"
                      >
                        Skip
                      </button>
                      <button
                        onClick={() => setTourStep(tourStep + 1)}
                        className={`h-11 px-6 rounded-xl ${theme.bg || "bg-violet-600"} ${theme.bgHover || "hover:bg-violet-700"} text-white font-bold text-xs active:scale-95 shadow-md ${theme.shadow} transition-all cursor-pointer min-w-[100px]`}
                      >
                        Next
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={handleCompleteTour}
                      className={`h-11 px-6 rounded-xl bg-gradient-to-r ${theme.gradient || "from-violet-600 to-fuchsia-600"} text-white font-bold text-xs active:scale-95 shadow-md ${theme.shadow} transition-all cursor-pointer min-w-[120px]`}
                    >
                      Finish
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ====== MOBILE GLASS BOTTOM NAVIGATION BAR ====== */}
      {/* Only visible on mobile/tablet (hidden on lg+). Desktop uses the left sidebar. */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50">
        {/* Glass container */}
        <div
          className="relative mx-3 mb-3 rounded-[28px] overflow-hidden"
          style={{
            background: "color-mix(in srgb, var(--surface) 85%, transparent)",
            backdropFilter: "blur(24px) saturate(1.8)",
            WebkitBackdropFilter: "blur(24px) saturate(1.8)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            border: "1px solid var(--border)",
          }}
        >
          {/* Active tab accent line at top */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ backgroundColor: "var(--accent)", opacity: 0.8 }}
          />

          <div className="flex items-center justify-around px-2 py-2">
            {[
              { id: "dashboard",  label: "Home",      icon: LayoutDashboard },
              { id: "checklist",  label: "Syllabus",  icon: ListTodo },
              { id: "notes",      label: "Notes",     icon: FileText,
                badge: currentSyllabus ? (currentSyllabus.keepNotes?.length || 0) : standaloneNotes.length },
              { id: "analytics",  label: "Stats",     icon: LineChart },
              { id: "settings",   label: "Settings",  icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeSidebarTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setActiveSidebarTab(item.id as any);
                    setSidebarOpen(false);
                  }}
                  className="relative flex flex-col items-center justify-center gap-0.5 px-3 py-2 min-w-[56px] cursor-pointer select-none transition-all duration-200 active:scale-90 rounded-2xl"
                >
                  {/* Active pill background */}
                  {isActive && (
                    <span
                      className="absolute inset-0 rounded-2xl"
                      style={{
                        background: "var(--accent-soft)",
                      }}
                    />
                  )}

                  {/* Icon with optional badge */}
                  <span className="relative">
                    <Icon
                      width={22}
                      height={22}
                      className="shrink-0 transition-all duration-200"
                      style={{
                        color: isActive ? "var(--accent)" : "var(--text-muted)",
                        filter: isActive ? "drop-shadow(0 0 6px var(--accent-glow))" : "none",
                        transform: isActive ? "scale(1.1) translateY(-1px)" : "scale(1)",
                      }}
                    />
                    {/* Badge dot */}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] rounded-full text-white text-[8px] font-black flex items-center justify-center px-[3px] leading-none"
                        style={{
                          background: "var(--accent)",
                          boxShadow: "0 0 0 2px var(--surface)",
                        }}
                      >
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </span>

                  {/* Label */}
                  <span
                    className="text-[9px] font-bold tracking-wide transition-all duration-200 leading-none"
                    style={{
                      color: isActive ? "var(--accent)" : "var(--text-muted)",
                      fontWeight: isActive ? 800 : 600,
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* iPhone home indicator safe-area padding */}
          <div className="h-safe-bottom" style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
        </div>
      </nav>

    </div>
  );
}

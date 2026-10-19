import React from "react";
import { CheckCircle2, Clock, BookOpen, Calendar, ChevronRight, ChevronDown, ListTodo, FileText, ArrowRight, Activity, Bell, Sparkles, RefreshCw, GraduationCap, Plus, Check, ChevronLeft, Pencil, X, Undo, Trash2 } from "lucide-react";
import { Syllabus } from "../types";
import { motion } from "motion/react";

const getStripeColor = (statusColor: string) => {
  if (!statusColor) return "var(--status-upcoming)";
  const col = statusColor.toLowerCase();
  if (col.includes("rose") || col.includes("red") || col.includes("overdue") || col.includes("c0392b") || col.includes("emerald")) {
    // Note: since our default getUpcomingTasks has some emerald-500 mock tasks, we can map red/rose to overdue
    if (col.includes("emerald") || col.includes("green") || col.includes("complete") || col.includes("2e8b6e")) {
      return "var(--status-upcoming)";
    }
    return "var(--status-overdue)";
  }
  if (col.includes("amber") || col.includes("yellow") || col.includes("due-soon") || col.includes("c08a2e")) {
    return "var(--status-due-soon)";
  }
  return "var(--status-upcoming)";
};

// List of high-quality default motivational quotes categorised by time of day
const defaultQuotes = {
  morning: [
    { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { quote: "Write it on your heart that every day is the best day in the year.", author: "Ralph Waldo Emerson" },
    { quote: "Today's accomplishments were yesterday's impossibilities.", author: "Robert H. Schuller" },
    { quote: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt" },
    { quote: "Do not wait; the time will never be 'just right.' Start where you stand.", author: "George Herbert" },
    { quote: "With the new day comes new strength and new thoughts.", author: "Eleanor Roosevelt" },
    { quote: "Your focus determines your reality.", author: "Qui-Gon Jinn" },
    { quote: "Seize the morning! Each sunrise is a fresh canvas for your academic achievements.", author: "Syllabus Mentor" },
    { quote: "Excellence is not a singular act, but a habit. Make today excellent.", author: "Aristotle" },
    { quote: "Success is the sum of small efforts, repeated day in and day out.", author: "Robert Collier" }
  ],
  evening: [
    { quote: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
    { quote: "The power of concentration is the only key to the treasure-house of knowledge.", author: "Swami Vivekananda" },
    { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
    { quote: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { quote: "Review your day with gratitude. Progress is made in the quiet hours of persistence.", author: "Study Wisdom" },
    { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { quote: "The beautiful thing about learning is that nobody can take it away from you.", author: "B.B. King" },
    { quote: "Press forward. The momentum you build this afternoon will carry you over tomorrow's hurdles.", author: "Focus Guide" },
    { quote: "Your mind is a muscle. Keep training it, keep pushing, keep discovering.", author: "Academic Mindset" },
    { quote: "Success isn't overnight. It's when every day you get a little better than the day before.", author: "Dwayne Johnson" }
  ],
  night: [
    { quote: "Quiet minds build powerful dreams. Keep your focus sharp in the peaceful hours.", author: "Dreamer's Code" },
    { quote: "Great things are done by a series of small things brought together.", author: "Vincent van Gogh" },
    { quote: "The stars cannot shine without darkness. Your hard work tonight will illuminate your future.", author: "Night Owl Wisdom" },
    { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { quote: "Sleep is the best meditation, but a final focused review brings ultimate peace of mind.", author: "Scholar's Advice" },
    { quote: "Deep learning happens when the noise of the world fades away. Enjoy the quiet focus.", author: "Silent Sage" },
    { quote: "Don't count the days, make the days count.", author: "Muhammad Ali" },
    { quote: "The future depends on what you do today, even in the quiet of the night.", author: "Mahatma Gandhi" },
    { quote: "Work hard in silence, let your success be your noise.", author: "Frank Ocean" },
    { quote: "There is no elevator to success; you have to take the stairs. One step tonight.", author: "Zig Ziglar" }
  ]
};

const getQuotesTimeOfDayKey = (hours: number): "morning" | "evening" | "night" => {
  if (hours >= 5 && hours < 12) {
    return "morning";
  } else if (hours >= 12 && hours < 21) {
    return "evening";
  } else {
    return "night";
  }
};

interface DashboardViewProps {
  syllabus: Syllabus | null;
  syllabuses?: Syllabus[];
  onSelectSyllabus?: (id: string) => void;
  onAddCourse?: () => void;
  user: any;
  guestName: string;
  onNavigate: (tab: "dashboard" | "checklist" | "notes" | "timer" | "analytics" | "calendar" | "bookmarks" | "settings" | "help") => void;
  completedCount: number;
  inProgressCount: number;
  pendingCount: number;
  totalCount: number;
  recentActivities: Array<{
    id: string;
    type: string;
    title: string;
    detail: string;
    time: string;
  }>;
  upcomingTasks: Array<{
    id: string;
    unitId?: string;
    topicId?: string;
    unitName: string;
    topicName: string;
    date: string;
    targetDate?: string;
    statusColor: string;
  }>;
  primaryColor?: string;
  onToggleTopic?: (unitId: string, topicId: string) => void;
  onUpdateTopicAndUnit?: (unitId: string, topicId: string, newUnitName: string, newTopicName: string, newTargetDate: string) => void;
  onUndoActivity?: (topicId: string) => void;
  onDeleteSyllabus?: (id: string) => void;
}

export default function DashboardView({
  syllabus,
  syllabuses = [],
  onSelectSyllabus,
  onAddCourse,
  user,
  guestName,
  onNavigate,
  completedCount,
  inProgressCount,
  pendingCount,
  totalCount,
  recentActivities,
  upcomingTasks,
  primaryColor,
  onToggleTopic,
  onUpdateTopicAndUnit,
  onUndoActivity,
  onDeleteSyllabus
}: DashboardViewProps) {
  const displayName = user
    ? user.displayName?.split(" ")[0] || "Scholar"
    : guestName.split(" ")[0] || "Scholar";

  const [currentTime, setCurrentTime] = React.useState(() => new Date());
  const [showDropdown, setShowDropdown] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Get unique unit names and topic names for autocomplete recommendations
  const recommendedUnitNames = React.useMemo(() => {
    if (!syllabus) return [];
    const names = syllabus.units.map(u => u.name?.trim()).filter(Boolean);
    return Array.from(new Set(names));
  }, [syllabus]);

  const recommendedTopicNames = React.useMemo(() => {
    if (!syllabus) return [];
    const names: string[] = [];
    syllabus.units.forEach(u => {
      u.topics.forEach(t => {
        if (t.name) names.push(t.name.trim());
      });
    });
    return Array.from(new Set(names)).filter(Boolean);
  }, [syllabus]);

  // State for customizing a topic's Unit Name and Target Date
  const [editingTask, setEditingTask] = React.useState<{
    unitId: string;
    topicId: string;
    unitName: string;
    topicName: string;
    targetDate: string; // YYYY-MM-DD
  } | null>(null);

  // States for custom autocomplete dropdowns inside Customize Task modal
  const [showTopicSuggestions, setShowTopicSuggestions] = React.useState(false);
  const [showUnitSuggestions, setShowUnitSuggestions] = React.useState(false);

  const filteredTopics = React.useMemo(() => {
    if (!editingTask) return [];
    const query = (editingTask.topicName || "").toLowerCase().trim();
    if (!query) return recommendedTopicNames.slice(0, 8);
    return recommendedTopicNames.filter(name => name.toLowerCase().includes(query)).slice(0, 8);
  }, [editingTask?.topicName, recommendedTopicNames]);

  const filteredUnits = React.useMemo(() => {
    if (!editingTask) return [];
    const query = (editingTask.unitName || "").toLowerCase().trim();
    if (!query) return recommendedUnitNames.slice(0, 8);
    return recommendedUnitNames.filter(name => name.toLowerCase().includes(query)).slice(0, 8);
  }, [editingTask?.unitName, recommendedUnitNames]);

  // State for Schedule Pending Tasks Modal
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);
  const [showUpcomingModal, setShowUpcomingModal] = React.useState(false);
  const [scheduleSelectedDates, setScheduleSelectedDates] = React.useState<Record<string, string>>({});
  const [showHistoryModal, setShowHistoryModal] = React.useState(false);

  const unscheduledTopics = React.useMemo(() => {
    if (!syllabus) return [];
    const list: Array<{
      unitId: string;
      unitName: string;
      topicId: string;
      topicName: string;
    }> = [];
    syllabus.units.forEach((unit) => {
      unit.topics.forEach((topic) => {
        if (!topic.completed && !topic.targetDate) {
          list.push({
            unitId: unit.id,
            unitName: unit.name,
            topicId: topic.id,
            topicName: topic.name,
          });
        }
      });
    });
    return list;
  }, [syllabus]);

  const handleStartEdit = (task: any) => {
    let defaultDate = "";
    if (task.targetDate) {
      defaultDate = task.targetDate;
    } else {
      try {
        const currentYear = new Date().getFullYear();
        const monthMap: Record<string, string> = {
          jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
          jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12"
        };
        
        const parts = task.date.trim().split(/\s+/);
        let dayStr = "";
        let monthStr = "";
        
        if (parts.length === 2) {
          if (isNaN(Number(parts[0]))) {
            // "Jul 20"
            monthStr = monthMap[parts[0].toLowerCase().substring(0, 3)] || "01";
            dayStr = parts[1].padStart(2, "0");
          } else {
            // "24 May"
            dayStr = parts[0].padStart(2, "0");
            monthStr = monthMap[parts[1].toLowerCase().substring(0, 3)] || "01";
          }
          defaultDate = `${currentYear}-${monthStr}-${dayStr}`;
        } else {
          const parsed = new Date(`${task.date} ${currentYear}`);
          if (!isNaN(parsed.getTime())) {
            defaultDate = parsed.toISOString().split("T")[0];
          } else {
            defaultDate = new Date().toISOString().split("T")[0];
          }
        }
      } catch (e) {
        defaultDate = new Date().toISOString().split("T")[0];
      }
    }

    setEditingTask({
      unitId: task.unitId || "",
      topicId: task.topicId || "",
      unitName: task.unitName || "",
      topicName: task.topicName || "",
      targetDate: defaultDate,
    });
  };

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // State for motivational quotes
  const [activeCategory, setActiveCategory] = React.useState<"morning" | "evening" | "night">(() => {
    return getQuotesTimeOfDayKey(new Date().getHours());
  });

  const [quoteState, setQuoteState] = React.useState<{ quote: string; author: string }>(() => {
    const hours = new Date().getHours();
    const key = getQuotesTimeOfDayKey(hours);
    const quotesList = defaultQuotes[key];
    const randomIndex = Math.floor(Math.random() * quotesList.length);
    return quotesList[randomIndex];
  });

  const [isFetchingQuote, setIsFetchingQuote] = React.useState(false);

  // State for mobile statistics carousel/card swipe stack
  const [activeCardIndex, setActiveCardIndex] = React.useState(0);
  const [manualInteractionCount, setManualInteractionCount] = React.useState(0);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % 4);
    }, 4500); // Swipe automatically every 4.5 seconds
    return () => clearInterval(interval);
  }, [manualInteractionCount]);

  // Auto-update quote category if it changes over time
  React.useEffect(() => {
    const interval = setInterval(() => {
      const currentHours = new Date().getHours();
      const currentKey = getQuotesTimeOfDayKey(currentHours);
      if (currentKey !== activeCategory) {
        setActiveCategory(currentKey);
        const quotesList = defaultQuotes[currentKey];
        const randomIndex = Math.floor(Math.random() * quotesList.length);
        setQuoteState(quotesList[randomIndex]);
      }
    }, 15000); // Check every 15 seconds to be ultra responsive to system time
    return () => clearInterval(interval);
  }, [activeCategory]);

  const handleGetFreshQuote = async () => {
    setIsFetchingQuote(true);
    try {
      const res = await fetch("/api/generate-quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ timeOfDay: activeCategory })
      });
      if (!res.ok) throw new Error("Failed to fetch custom quote");
      const data = await res.json();
      if (data.quote && data.author) {
        setQuoteState({ quote: data.quote, author: data.author });
      } else {
        throw new Error("Invalid quote format");
      }
    } catch (error) {
      console.error("Error fetching AI quote, falling back to local rotation:", error);
      // Fallback: rotate to another random local quote of the current category that is different from current
      const quotesList = defaultQuotes[activeCategory];
      let nextQuote = quotesList[Math.floor(Math.random() * quotesList.length)];
      for (let i = 0; i < 5; i++) {
        if (nextQuote.quote === quoteState.quote) {
          nextQuote = quotesList[Math.floor(Math.random() * quotesList.length)];
        } else {
          break;
        }
      }
      setQuoteState(nextQuote);
    } finally {
      setIsFetchingQuote(false);
    }
  };

  // Calculate percentages for Overall Progress donut
  const completedPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const inProgressPct = totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0;
  const pendingPct = totalCount > 0 ? Math.max(0, 100 - completedPct - inProgressPct) : 100;

  // Donut chart SVG calculations
  const radius = 50;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius; // ~314.16

  const completedStroke = (completedPct / 100) * circumference;
  const inProgressStroke = (inProgressPct / 100) * circumference;
  const pendingStroke = (pendingPct / 100) * circumference;

  // Offset calculations (since SVG strokes are placed end-to-end)
  const completedOffset = 0;
  const inProgressOffset = -completedStroke;
  const pendingOffset = -(completedStroke + inProgressStroke);

  // Segment gaps logic for ultra-smooth rendering with rounded line caps
  const activeSegmentsCount = (completedPct > 0 ? 1 : 0) + (inProgressPct > 0 ? 1 : 0) + (pendingPct > 0 ? 1 : 0);
  const gapLength = activeSegmentsCount > 1 ? 6 : 0;
  const halfGap = gapLength / 2;

  // Dynamic Time & Day Greeting Engine
  const getGreetingData = (now: Date) => {
    const hrs = now.getHours();
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[now.getDay()];

    let greetingText = "Welcome Back";
    let subText = "Let's organize, study, and master your subjects today.";
    let icon = "👋";

    if (hrs >= 5 && hrs < 12) {
      greetingText = "Good Morning";
      subText = `Happy ${dayName}! 🌅 Start your morning with structured learning and focused study goals.`;
      icon = "🌅";
    } else if (hrs >= 12 && hrs < 17) {
      greetingText = "Good Afternoon";
      subText = `Happy ${dayName}! ☀️ Hope your afternoon study sessions are productive and going strong!`;
      icon = "☀️";
    } else if (hrs >= 17 && hrs < 22) {
      greetingText = "Good Evening";
      subText = `Good evening! 🌙 A wonderful time to wrap up your ${dayName} syllabus topics and review notes.`;
      icon = "🌙";
    } else {
      greetingText = "Good Night";
      subText = `Having a late-night study session? 🌌 Stay focused, keep the quiet momentum, and end your ${dayName} strong!`;
      icon = "🌌";
    }

    // Format local date elegantly
    const formattedDate = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });

    const formattedTime = now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    return { greetingText, subText, icon, formattedDate, formattedTime, dayName };
  };

  // Accent color-graded mapping
  const getColorScheme = (color: string) => {
    switch (color) {
      case "violet":
        return {
          bgGradient: "from-violet-600 to-fuchsia-600",
          text: "text-violet-600 dark:text-violet-400",
          bgLight: "bg-violet-50 dark:bg-violet-950/25",
          border: "border-violet-100 dark:border-violet-950/50",
          borderHover: "hover:border-violet-400/40",
          accentRing: "ring-violet-500/20",
          badgeBg: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
          hex: "#8b5cf6",
          bgFilled: "bg-violet-600 dark:bg-violet-500",
          bgFilledHover: "hover:bg-violet-700 dark:hover:bg-violet-600"
        };
      case "emerald":
        return {
          bgGradient: "from-emerald-500 to-teal-600",
          text: "text-emerald-600 dark:text-emerald-400",
          bgLight: "bg-emerald-50 dark:bg-emerald-950/25",
          border: "border-emerald-100 dark:border-emerald-950/50",
          borderHover: "hover:border-emerald-400/40",
          accentRing: "ring-emerald-500/20",
          badgeBg: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
          hex: "#10b981",
          bgFilled: "bg-emerald-600 dark:bg-emerald-500",
          bgFilledHover: "hover:bg-emerald-700 dark:hover:bg-emerald-600"
        };
      case "rose":
        return {
          bgGradient: "from-rose-500 to-pink-600",
          text: "text-rose-600 dark:text-rose-400",
          bgLight: "bg-rose-50 dark:bg-rose-950/25",
          border: "border-rose-100 dark:border-rose-950/50",
          borderHover: "hover:border-rose-400/40",
          accentRing: "ring-rose-500/20",
          badgeBg: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
          hex: "#f43f5e",
          bgFilled: "bg-rose-600 dark:bg-rose-500",
          bgFilledHover: "hover:bg-rose-700 dark:hover:bg-rose-600"
        };
      case "amber":
        return {
          bgGradient: "from-amber-500 to-orange-500",
          text: "text-amber-600 dark:text-amber-400",
          bgLight: "bg-amber-50 dark:bg-amber-950/25",
          border: "border-amber-100 dark:border-amber-950/50",
          borderHover: "hover:border-amber-400/40",
          accentRing: "ring-amber-500/20",
          badgeBg: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
          hex: "#f59e0b",
          bgFilled: "bg-amber-500 dark:bg-amber-550",
          bgFilledHover: "hover:bg-amber-600 dark:hover:bg-amber-500"
        };
      case "terracotta":
        return {
          bgGradient: "from-[#D5360C] to-[#F97316]",
          text: "text-[#D5360C] dark:text-[#FB923C]",
          bgLight: "bg-[#D5360C]/10 dark:bg-[#D5360C]/20",
          border: "border-[#D5360C]/20 dark:border-[#D5360C]/35",
          borderHover: "hover:border-[#D5360C]/50",
          accentRing: "ring-[#D5360C]/25",
          badgeBg: "bg-[#D5360C]/15 text-[#D5360C] dark:bg-[#D5360C]/25 dark:text-[#FDBA74]",
          hex: "#D5360C",
          bgFilled: "bg-[#D5360C]",
          bgFilledHover: "hover:bg-[#B82E0A]"
        };
      case "indigo":
      default:
        return {
          bgGradient: "from-primary-app to-[#6366F1] dark:to-[#818CF8]",
          text: "text-primary-app",
          bgLight: "bg-primary-soft-app/25 dark:bg-primary-soft-app/10",
          border: "border-primary-app/20",
          borderHover: "hover:border-primary-app/40",
          accentRing: "ring-primary-app/20",
          badgeBg: "bg-primary-soft-app/30 text-primary-app dark:bg-primary-soft-app/15",
          hex: "var(--primary)",
          bgFilled: "bg-primary-app",
          bgFilledHover: "hover:bg-primary-active-app"
        };
    }
  };

  const greeting = getGreetingData(currentTime);
  const theme = getColorScheme(primaryColor || "indigo");

  const getThemedCardStyle = (cardId: "completed" | "in-progress" | "pending" | "total") => {
    const pCol = primaryColor || "indigo";
    const configs: Record<string, Record<string, {
      progressColor: string;
      pulseColor: string;
      iconBg: string;
      bottomBar: string;
      overlayGrad: string;
      blurBg: string;
      cardBg: string;
      cardBorder: string;
    }>> = {
      violet: {
        completed: {
          progressColor: "bg-violet-600 dark:bg-violet-400",
          pulseColor: "bg-violet-500",
          iconBg: "bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-800/40 text-violet-600 dark:text-violet-400",
          bottomBar: "bg-violet-500 dark:bg-violet-500",
          overlayGrad: "from-violet-500/[0.04] to-transparent",
          blurBg: "bg-violet-500/15",
          cardBg: "bg-gradient-to-br from-white to-violet-50/40 dark:from-[#110e20] dark:to-[#17132c]",
          cardBorder: "border-violet-150/80 dark:border-violet-500/15",
        },
        "in-progress": {
          progressColor: "bg-fuchsia-500 dark:bg-fuchsia-400",
          pulseColor: "bg-fuchsia-400",
          iconBg: "bg-fuchsia-50/80 dark:bg-fuchsia-950/30 border border-fuchsia-100 dark:border-fuchsia-500/10 text-fuchsia-500 dark:text-fuchsia-400",
          bottomBar: "bg-fuchsia-400 dark:bg-fuchsia-500",
          overlayGrad: "from-fuchsia-500/[0.04] to-transparent",
          blurBg: "bg-fuchsia-500/15",
          cardBg: "bg-gradient-to-br from-white to-fuchsia-50/40 dark:from-[#140e1f] dark:to-[#1a1228]",
          cardBorder: "border-fuchsia-150/80 dark:border-fuchsia-500/15",
        },
        pending: {
          progressColor: "bg-purple-300 dark:bg-purple-600/80",
          pulseColor: "bg-purple-300",
          iconBg: "bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500",
          bottomBar: "bg-purple-200 dark:bg-purple-800",
          overlayGrad: "from-purple-500/[0.03] to-transparent",
          blurBg: "bg-purple-500/12",
          cardBg: "bg-gradient-to-br from-white to-purple-50/30 dark:from-[#0f0c1c] dark:to-[#131121]",
          cardBorder: "border-slate-200/90 dark:border-slate-800/80",
        },
        total: {
          progressColor: "bg-gradient-to-r from-violet-600 to-fuchsia-600",
          pulseColor: "bg-violet-600",
          iconBg: "bg-violet-100 dark:bg-violet-900/50 border border-violet-200/50 dark:border-violet-800/50 text-violet-700 dark:text-violet-300",
          bottomBar: "bg-gradient-to-r from-violet-600 to-fuchsia-600",
          overlayGrad: "from-violet-600/[0.08] to-transparent",
          blurBg: "bg-violet-600/20",
          cardBg: "bg-gradient-to-br from-white via-violet-50/20 to-fuchsia-50/30 dark:from-[#130f28] dark:to-[#211438]",
          cardBorder: "border-violet-200 dark:border-violet-500/30",
        },
      },
      emerald: {
        completed: {
          progressColor: "bg-emerald-600 dark:bg-emerald-400",
          pulseColor: "bg-emerald-500",
          iconBg: "bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 text-emerald-600 dark:text-emerald-400",
          bottomBar: "bg-emerald-500 dark:bg-emerald-500",
          overlayGrad: "from-emerald-500/[0.04] to-transparent",
          blurBg: "bg-emerald-500/15",
          cardBg: "bg-gradient-to-br from-white to-emerald-50/40 dark:from-[#0b1210] dark:to-[#0e1c18]",
          cardBorder: "border-emerald-150/80 dark:border-emerald-500/15",
        },
        "in-progress": {
          progressColor: "bg-teal-500 dark:bg-teal-400",
          pulseColor: "bg-teal-400",
          iconBg: "bg-teal-50/80 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-500/10 text-teal-500 dark:text-teal-400",
          bottomBar: "bg-teal-400 dark:bg-teal-500",
          overlayGrad: "from-teal-500/[0.04] to-transparent",
          blurBg: "bg-teal-500/15",
          cardBg: "bg-gradient-to-br from-white to-teal-50/40 dark:from-[#0a1114] dark:to-[#0d1b1f]",
          cardBorder: "border-teal-150/80 dark:border-teal-500/15",
        },
        pending: {
          progressColor: "bg-green-300 dark:bg-green-600/80",
          pulseColor: "bg-green-300",
          iconBg: "bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500",
          bottomBar: "bg-green-200 dark:bg-green-800",
          overlayGrad: "from-green-500/[0.03] to-transparent",
          blurBg: "bg-green-500/12",
          cardBg: "bg-gradient-to-br from-white to-green-50/30 dark:from-[#0a110e] dark:to-[#0c1612]",
          cardBorder: "border-slate-200/90 dark:border-slate-800/80",
        },
        total: {
          progressColor: "bg-gradient-to-r from-emerald-500 to-teal-600",
          pulseColor: "bg-emerald-600",
          iconBg: "bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-200/50 dark:border-emerald-800/80 text-emerald-700 dark:text-emerald-300",
          bottomBar: "bg-gradient-to-r from-emerald-500 to-teal-600",
          overlayGrad: "from-emerald-600/[0.08] to-transparent",
          blurBg: "bg-emerald-600/20",
          cardBg: "bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 dark:from-[#0c1615] dark:to-[#0f2a24]",
          cardBorder: "border-emerald-200 dark:border-emerald-500/30",
        },
      },
      rose: {
        completed: {
          progressColor: "bg-rose-600 dark:bg-rose-400",
          pulseColor: "bg-rose-500",
          iconBg: "bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-800/40 text-rose-600 dark:text-rose-455",
          bottomBar: "bg-rose-500 dark:bg-rose-500",
          overlayGrad: "from-rose-500/[0.04] to-transparent",
          blurBg: "bg-rose-500/15",
          cardBg: "bg-gradient-to-br from-white to-rose-50/40 dark:from-[#140d10] dark:to-[#220f16]",
          cardBorder: "border-rose-150/80 dark:border-rose-500/15",
        },
        "in-progress": {
          progressColor: "bg-pink-500 dark:bg-pink-400",
          pulseColor: "bg-pink-400",
          iconBg: "bg-pink-50/80 dark:bg-pink-950/30 border border-pink-100 dark:border-pink-500/10 text-pink-500 dark:text-pink-400",
          bottomBar: "bg-pink-400 dark:bg-pink-500",
          overlayGrad: "from-pink-500/[0.04] to-transparent",
          blurBg: "bg-pink-500/15",
          cardBg: "bg-gradient-to-br from-white to-pink-50/40 dark:from-[#140c13] dark:to-[#210e1c]",
          cardBorder: "border-pink-150/80 dark:border-pink-500/15",
        },
        pending: {
          progressColor: "bg-rose-200 dark:bg-rose-800/80",
          pulseColor: "bg-rose-300",
          iconBg: "bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500",
          bottomBar: "bg-rose-100 dark:bg-rose-900/40",
          overlayGrad: "from-rose-500/[0.03] to-transparent",
          blurBg: "bg-rose-500/12",
          cardBg: "bg-gradient-to-br from-white to-rose-50/30 dark:from-[#120a0d] dark:to-[#1a0e13]",
          cardBorder: "border-slate-200/90 dark:border-slate-800/80",
        },
        total: {
          progressColor: "bg-gradient-to-r from-rose-500 to-pink-600",
          pulseColor: "bg-rose-600",
          iconBg: "bg-rose-100 dark:bg-rose-900/50 border border-rose-200/50 dark:border-rose-800/80 text-rose-700 dark:text-rose-300",
          bottomBar: "bg-gradient-to-r from-rose-500 to-pink-600",
          overlayGrad: "from-rose-600/[0.08] to-transparent",
          blurBg: "bg-rose-600/20",
          cardBg: "bg-gradient-to-br from-white via-rose-50/20 to-pink-50/30 dark:from-[#1b0d13] dark:to-[#2e0f22]",
          cardBorder: "border-rose-200 dark:border-rose-500/30",
        },
      },
      amber: {
        completed: {
          progressColor: "bg-amber-600 dark:bg-amber-400",
          pulseColor: "bg-amber-500",
          iconBg: "bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800/40 text-amber-600 dark:text-amber-455",
          bottomBar: "bg-amber-500 dark:bg-amber-500",
          overlayGrad: "from-amber-500/[0.04] to-transparent",
          blurBg: "bg-amber-500/15",
          cardBg: "bg-gradient-to-br from-white to-amber-50/40 dark:from-[#130f0b] dark:to-[#1f160e]",
          cardBorder: "border-amber-150/80 dark:border-amber-500/15",
        },
        "in-progress": {
          progressColor: "bg-orange-500 dark:bg-orange-400",
          pulseColor: "bg-orange-400",
          iconBg: "bg-orange-50/80 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-500/10 text-orange-500 dark:text-orange-400",
          bottomBar: "bg-orange-400 dark:bg-orange-500",
          overlayGrad: "from-orange-500/[0.04] to-transparent",
          blurBg: "bg-orange-500/15",
          cardBg: "bg-gradient-to-br from-white to-orange-50/40 dark:from-[#130d09] dark:to-[#21130a]",
          cardBorder: "border-orange-150/80 dark:border-orange-500/15",
        },
        pending: {
          progressColor: "bg-amber-200 dark:bg-amber-800/80",
          pulseColor: "bg-amber-300",
          iconBg: "bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500",
          bottomBar: "bg-amber-100 dark:bg-amber-900/40",
          overlayGrad: "from-amber-500/[0.03] to-transparent",
          blurBg: "bg-amber-500/12",
          cardBg: "bg-gradient-to-br from-white to-amber-50/30 dark:from-[#100c09] dark:to-[#16110d]",
          cardBorder: "border-slate-200/90 dark:border-slate-800/80",
        },
        total: {
          progressColor: "bg-gradient-to-r from-amber-500 to-orange-500",
          pulseColor: "bg-amber-600",
          iconBg: "bg-amber-100 dark:bg-amber-900/50 border border-amber-200/50 dark:border-amber-800/80 text-amber-700 dark:text-amber-300",
          bottomBar: "bg-gradient-to-r from-amber-500 to-orange-500",
          overlayGrad: "from-amber-600/[0.08] to-transparent",
          blurBg: "bg-amber-600/20",
          cardBg: "bg-gradient-to-br from-white via-amber-50/20 to-orange-50/30 dark:from-[#18100c] dark:to-[#2d150d]",
          cardBorder: "border-amber-200 dark:border-amber-500/30",
        },
      },
      terracotta: {
        completed: {
          progressColor: "bg-[#D5360C] dark:bg-[#EA580C]",
          pulseColor: "bg-[#D5360C]",
          iconBg: "bg-orange-50 dark:bg-orange-950/40 border border-[#D5360C]/20 text-[#D5360C] dark:text-[#FB923C]",
          bottomBar: "bg-[#D5360C] dark:bg-[#EA580C]",
          overlayGrad: "from-[#D5360C]/[0.05] to-transparent",
          blurBg: "bg-[#D5360C]/15",
          cardBg: "bg-gradient-to-br from-white to-orange-50/40 dark:from-[#180e0a] dark:to-[#28130a]",
          cardBorder: "border-[#D5360C]/20 dark:border-[#D5360C]/30",
        },
        "in-progress": {
          progressColor: "bg-[#F97316] dark:bg-[#FB923C]",
          pulseColor: "bg-[#F97316]",
          iconBg: "bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-500/20 text-[#D5360C] dark:text-[#FDBA74]",
          bottomBar: "bg-[#F97316] dark:bg-[#EA580C]",
          overlayGrad: "from-[#F97316]/[0.04] to-transparent",
          blurBg: "bg-[#F97316]/15",
          cardBg: "bg-gradient-to-br from-white to-amber-50/40 dark:from-[#160d08] dark:to-[#22120a]",
          cardBorder: "border-[#F97316]/20 dark:border-[#F97316]/25",
        },
        pending: {
          progressColor: "bg-stone-300 dark:bg-stone-700",
          pulseColor: "bg-stone-400",
          iconBg: "bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-400 dark:text-stone-500",
          bottomBar: "bg-stone-200 dark:bg-stone-800",
          overlayGrad: "from-[#D5360C]/[0.02] to-transparent",
          blurBg: "bg-[#D5360C]/10",
          cardBg: "bg-gradient-to-br from-white to-stone-50/40 dark:from-[#120c0a] dark:to-[#1a120e]",
          cardBorder: "border-stone-200/90 dark:border-stone-800/80",
        },
        total: {
          progressColor: "bg-gradient-to-r from-[#D5360C] to-[#F97316]",
          pulseColor: "bg-[#D5360C]",
          iconBg: "bg-orange-100 dark:bg-orange-950/50 border border-[#D5360C]/30 text-[#D5360C] dark:text-[#FDBA74]",
          bottomBar: "bg-gradient-to-r from-[#D5360C] to-[#F97316]",
          overlayGrad: "from-[#D5360C]/[0.08] to-transparent",
          blurBg: "bg-[#D5360C]/20",
          cardBg: "bg-gradient-to-br from-white via-orange-50/20 to-amber-50/30 dark:from-[#1a0e0a] dark:to-[#2c1308]",
          cardBorder: "border-[#D5360C]/30 dark:border-[#D5360C]/40",
        },
      },
      indigo: {
        completed: {
          progressColor: "bg-primary-app",
          pulseColor: "bg-primary-app",
          iconBg: "bg-primary-soft-app/20 border border-primary-app/10 text-primary-app",
          bottomBar: "bg-primary-app",
          overlayGrad: "from-primary-app/5 to-transparent",
          blurBg: "bg-primary-app/10",
          cardBg: "bg-gradient-to-br from-white to-primary-soft-app/20 dark:from-[#110d0c] dark:to-[#1a110e]",
          cardBorder: "border-primary-app/15",
        },
        "in-progress": {
          progressColor: "bg-amber-500",
          pulseColor: "bg-amber-400",
          iconBg: "bg-amber-50/80 dark:bg-amber-950/30 border border-amber-150 dark:border-amber-500/10 text-amber-600 dark:text-amber-400",
          bottomBar: "bg-amber-400 dark:bg-amber-500",
          overlayGrad: "from-amber-500/[0.04] to-transparent",
          blurBg: "bg-amber-500/15",
          cardBg: "bg-gradient-to-br from-white to-amber-50/40 dark:from-[#150f08] dark:to-[#22170c]",
          cardBorder: "border-amber-150/80 dark:border-amber-500/15",
        },
        pending: {
          progressColor: "bg-slate-300 dark:bg-slate-700",
          pulseColor: "bg-slate-400",
          iconBg: "bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500",
          bottomBar: "bg-slate-200 dark:bg-slate-800",
          overlayGrad: "from-slate-500/[0.03] to-transparent",
          blurBg: "bg-slate-500/12",
          cardBg: "bg-gradient-to-br from-white to-slate-50/30 dark:from-[#0a0b14] dark:to-[#0e0f1d]",
          cardBorder: "border-slate-200/90 dark:border-slate-800/80",
        },
        total: {
          progressColor: "bg-gradient-to-r from-primary-app to-amber-500",
          pulseColor: "bg-primary-app",
          iconBg: "bg-primary-soft-app/30 dark:bg-primary-soft-app/15 border border-primary-app/20 text-primary-app",
          bottomBar: "bg-gradient-to-r from-primary-app to-amber-500",
          overlayGrad: "from-primary-app/[0.08] to-transparent",
          blurBg: "bg-primary-app/20",
          cardBg: "bg-gradient-to-br from-white via-primary-soft-app/15 to-amber-50/20 dark:from-[#1b120f] dark:to-[#25150e]",
          cardBorder: "border-primary-app/30",
        },
      },
    };

    const selectedThemeConfig = configs[pCol] || configs.indigo;
    return selectedThemeConfig[cardId];
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in font-sans">
      {/* 1. Welcome Hero Greeting Card - Clean and polished */}
      <div className="relative bg-surface-app border border-hairline-soft-app rounded-2xl p-4 sm:p-6 transition-all duration-300">
        <div className="relative flex flex-row justify-between items-center gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold font-serif tracking-tight text-ink-app leading-tight">
              {greeting.greetingText}, <span className="text-primary-app">{displayName}</span>!
            </h1>
            {syllabus?.examDate && (
              <div className="pt-0.5 sm:pt-1">
                <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md text-[9px] sm:text-[11px] font-bold bg-primary-app text-white hover:bg-primary-active-app border border-primary-app/10 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer whitespace-nowrap">
                  <Calendar className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5" />
                  <span>Exam Date: {new Date(syllabus.examDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                </span>
              </div>
            )}
          </div>

          {/* Elegant live digital clock - positioned at the right middle with compact responsive layout */}
          <div className="flex items-center gap-1.5 sm:gap-3 px-2 py-1 sm:px-5 sm:py-2.5 rounded-lg sm:rounded-2xl border border-hairline-soft-app bg-card-app/90 shadow-xs select-none shrink-0">
            <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-primary-app animate-pulse" />
            <div className="flex flex-col">
              <span className="text-xs sm:text-base md:text-lg font-black text-ink-app font-mono tracking-tight leading-none">
                {greeting.formattedTime}
              </span>
              <span className="text-[8px] sm:text-[10px] font-bold text-muted-app uppercase tracking-wider mt-0.5 sm:mt-1.5 leading-none">
                {greeting.formattedDate}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Legendary next-deadline-hero-card in full strictness of design spec */}
      {upcomingTasks && upcomingTasks.length > 0 ? (() => {
        const nextTask = upcomingTasks[0];
        const stripeColor = getStripeColor(nextTask.statusColor);
        return (
          <div 
            className="relative bg-surface-app border border-hairline-soft-app rounded-2xl p-4 sm:p-6 md:p-8 overflow-hidden border-l-4 shadow-signature transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6"
            style={{ borderLeftColor: stripeColor }}
          >
            {/* Extremely faint oversized icon tucked into the bottom right corner */}
            <BookOpen className="absolute -right-8 -bottom-8 w-48 h-48 text-ink-app/[0.02] pointer-events-none transform -rotate-12" />

            <div className="relative space-y-1.5 flex-1 min-w-0">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-muted-soft-app block leading-none">
                {syllabus?.subjectName || "Subject Workspace"}
              </span>
              <h2 className="font-serif text-lg sm:text-xl md:text-[26px] font-medium tracking-tight text-ink-app leading-tight truncate">
                {nextTask.topicName}
              </h2>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1 sm:mt-2">
                <span className="text-[11px] sm:text-xs text-muted-app font-medium">{nextTask.unitName}</span>
                <span className={`inline-flex items-center gap-1 font-mono text-[11px] sm:text-xs ${theme.text}`}>
                  <Clock className="w-3.5 h-3.5" />
                  <span>Target Due: {nextTask.date}</span>
                </span>
              </div>
            </div>

            <div className="relative shrink-0 flex flex-wrap items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
              <button
                onClick={() => handleStartEdit(nextTask)}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 h-10 rounded-full bg-card-app hover:bg-card-strong-app text-ink-app border border-hairline-app font-bold text-xs sm:text-xs hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-xs whitespace-nowrap`}
              >
                <Pencil className="w-3.5 h-3.5 text-primary-app shrink-0" />
                <span>Customize Target</span>
              </button>
              <button
                onClick={() => {
                  if (onToggleTopic && nextTask.unitId && nextTask.topicId) {
                    onToggleTopic(nextTask.unitId, nextTask.topicId);
                  } else {
                    onNavigate("checklist");
                  }
                }}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-5 h-10 rounded-full bg-gradient-to-r ${theme.bgGradient} hover:brightness-110 text-white font-bold text-xs sm:text-sm active:scale-[0.96] transition-all duration-150 cursor-pointer whitespace-nowrap`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>Mark complete</span>
              </button>
              <button
                onClick={() => onNavigate("checklist")}
                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 h-10 rounded-full ${theme.bgLight} border ${theme.border} ${theme.text} ${theme.borderHover} font-bold text-xs sm:text-xs hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 cursor-pointer shadow-xs whitespace-nowrap`}
              >
                <ListTodo className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                <span>View Checklist</span>
              </button>
            </div>
          </div>
        );
      })() : (
        <div 
          className="relative bg-surface-app rounded-2xl p-4 sm:p-6 md:p-8 overflow-hidden border-l-4 shadow-signature transition-all"
          style={{ borderLeftColor: "var(--status-complete)" }}
        >
          <BookOpen className="absolute -right-8 -bottom-8 w-48 h-48 text-ink-app/[0.02] pointer-events-none transform -rotate-12" />
          <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
            <div>
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-widest text-muted-soft-app block leading-none">Next Up</span>
              <h2 className="font-serif text-lg sm:text-xl md:text-[26px] font-medium tracking-tight text-ink-app mt-1.5 sm:mt-2 leading-tight">
                All caught up!
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-app font-medium mt-1">You have no pending tasks. Enjoy your study-free momentum!</p>
            </div>
            <button
              onClick={() => onNavigate("checklist")}
              className={`w-full sm:w-auto px-5 py-2.5 h-10 rounded-full bg-gradient-to-r ${theme.bgGradient} hover:brightness-110 text-white font-bold text-xs sm:text-sm active:scale-[0.96] transition-all duration-150 cursor-pointer`}
            >
              Open Checklist
            </button>
          </div>
        </div>
      )}

      {/* 3. Standalone Subject Switcher Bar - Compact & Elegant */}
      <div className="flex flex-row items-center justify-between gap-3 p-3.5 bg-surface-app border border-hairline-soft-app rounded-xl relative z-20 w-full min-w-0">
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
          <div className="p-1.5 rounded-lg bg-primary-soft-app/30 text-primary-app shrink-0">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-soft-app block leading-tight">
              Active Subject
            </span>
            <h3 className="text-xs sm:text-sm font-bold text-ink-app leading-snug break-words whitespace-normal">
              {syllabus?.subjectName || "No Subject Tracked Yet"}
            </h3>
          </div>
        </div>

        {/* Dropdown switch button - Sleek pill styling */}
        <div ref={dropdownRef} className="relative z-30 shrink-0">
          <button
            onClick={() => {
              if (syllabuses && syllabuses.length > 0) {
                setShowDropdown(!showDropdown);
              }
            }}
            className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 min-[360px]:px-3.5 bg-card-app hover:bg-card-strong-app text-ink-app text-[10px] min-[360px]:text-[11px] sm:text-xs font-bold rounded-full border border-hairline-app transition-all cursor-pointer whitespace-nowrap"
            disabled={!syllabuses || syllabuses.length === 0}
          >
            <span>Switch Subject</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80 shrink-0" />
          </button>

          {/* Switch Subject Dropdown Menu */}
          {showDropdown && syllabuses && syllabuses.length > 0 && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-surface-app border border-hairline-app rounded-2xl shadow-xl py-2 z-50">
              <div className="px-3.5 py-1.5 border-b border-hairline-soft-app flex items-center justify-between">
                <p className="text-[10px] font-bold text-muted-soft-app uppercase tracking-wider">
                  Switch Active Subject
                </p>
                {syllabuses.length > 1 && (
                  <span className="text-[8px] font-bold bg-primary-soft-app/30 text-primary-app px-1.5 py-0.5 rounded-md uppercase">
                    {syllabuses.length} options
                  </span>
                )}
              </div>
              <div className="max-h-56 overflow-y-auto py-1 scrollbar-thin">
                {syllabuses.map((s) => {
                  const isSelected = s.id === syllabus?.id;
                  const sTopics = s.units?.flatMap(u => u.topics) || [];
                  const sCompleted = sTopics.filter(t => t.completed).length;
                  const sPct = sTopics.length > 0 ? Math.round((sCompleted / sTopics.length) * 100) : 0;

                  return (
                    <div
                      key={s.id}
                      className={`px-3.5 py-2.5 hover:bg-card-app/40 flex items-center justify-between gap-3 transition-colors ${
                        isSelected ? "bg-card-app/30" : ""
                      }`}
                    >
                      <div
                        onClick={() => {
                          if (onSelectSyllabus) {
                            onSelectSyllabus(s.id);
                          }
                          setShowDropdown(false);
                        }}
                        className="min-w-0 flex-1 cursor-pointer"
                      >
                        <p className={`text-xs font-bold truncate ${
                          isSelected ? "text-primary-app font-black" : "text-body-app"
                        }`}>
                          {s.subjectName}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex-1 h-1 bg-card-app rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-primary-app" 
                              style={{ width: `${sPct}%` }}
                            />
                          </div>
                          <span className="text-[9px] font-bold text-muted-app">{sPct}%</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-primary-app shrink-0" />
                        )}
                        {onDeleteSyllabus && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSyllabus(s.id);
                              setShowDropdown(false);
                            }}
                            className="p-1 rounded-md text-muted-soft-app hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
                            title={`Delete subject ${s.subjectName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {onAddCourse && (
                <div className="border-t border-hairline-soft-app pt-1.5 px-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onAddCourse();
                      setShowDropdown(false);
                    }}
                    className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-full text-[11px] font-bold text-primary-app hover:bg-primary-soft-app/10 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Track Another Subject</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Elegant grid of 4 metric cards - strictly borderless / calm, no unrequested carousel swiping */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
        {[
          {
            id: "completed",
            title: "Completed",
            count: completedCount,
            label: "Topics Mastered",
            icon: CheckCircle2,
            progress: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
            colorClass: theme.text,
            bgClass: theme.bgLight
          },
          {
            id: "in-progress",
            title: "In Progress",
            count: inProgressCount,
            label: "Topics Active",
            icon: Clock,
            progress: totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0,
            colorClass: "text-sky-600 dark:text-sky-400",
            bgClass: "bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/10"
          },
          {
            id: "pending",
            title: "Pending",
            count: pendingCount,
            label: "Topics Remaining",
            icon: Clock,
            progress: totalCount > 0 ? Math.round((pendingCount / totalCount) * 100) : 0,
            colorClass: "text-slate-500 dark:text-slate-400",
            bgClass: "bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40"
          },
          {
            id: "total",
            title: "Total Topics",
            count: totalCount,
            label: "Syllabus Scope",
            icon: BookOpen,
            progress: 100,
            colorClass: "text-primary-app",
            bgClass: "bg-primary-soft-app/20 dark:bg-primary-soft-app/10"
          }
        ].map((card) => {
          const CardIcon = card.icon;
          return (
            <div 
              key={card.id} 
              className="bg-surface-app border border-hairline-soft-app rounded-2xl p-4 flex flex-col justify-between h-[130px] transition-all hover:border-hairline-app"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-muted-soft-app uppercase tracking-wider">{card.title}</span>
                  <span className="text-2.5xl font-bold text-ink-app block font-serif mt-1">{card.count}</span>
                </div>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${card.bgClass} ${card.colorClass}`}>
                  <CardIcon className="w-4.5 h-4.5" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[9px] font-bold text-muted-soft-app">
                  <span>{card.label}</span>
                  <span>{card.progress}%</span>
                </div>
                <div className="w-full h-1 bg-card-app rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      card.id === "completed" 
                        ? theme.bgFilled || "bg-primary-app" 
                        : card.id === "in-progress" 
                        ? "bg-sky-500 dark:bg-sky-400" 
                        : card.id === "pending" 
                        ? "bg-slate-300 dark:bg-slate-500" 
                        : "bg-primary-app"
                    }`} 
                    style={{ width: `${card.progress}%` }} 
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle Grid: Overall Progress Chart & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Overall Progress Donut Chart */}
        <div className="bg-surface-app border border-hairline-soft-app rounded-[24px] p-6 flex flex-col justify-between transition-all hover:border-hairline-app lg:col-span-2 min-h-[300px]">
          <div>
            <h3 className="text-sm font-bold text-ink-app font-display tracking-tight mb-4">
              Overall Progress
            </h3>

            {/* Circular Chart Container */}
            <div className="flex items-center justify-center py-4">
              <div className="relative w-36 h-36 flex items-center justify-center">
                {/* SVG Donut */}
                <svg className="w-full h-full transform -rotate-90 drop-shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:drop-shadow-[0_4px_20px_rgba(0,0,0,0.25)]" viewBox="0 0 120 120">
                  {/* Base grey background ring */}
                  <circle
                    cx="60"
                    cy="60"
                    r={radius}
                    fill="transparent"
                    stroke="var(--hairline-soft)"
                    strokeWidth={strokeWidth}
                  />

                  {/* Pending Segment (Slate/Gray) */}
                  {pendingPct > 0 && (
                    <motion.circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="currentColor"
                      className="text-slate-300 dark:text-slate-600 stroke-current"
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={`${Math.max(0, pendingStroke - gapLength)} ${circumference}`}
                      initial={{ strokeDashoffset: pendingOffset - halfGap + pendingStroke }}
                      animate={{ strokeDashoffset: pendingOffset - halfGap }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}

                  {/* In Progress Segment (Sky Blue) */}
                  {inProgressPct > 0 && (
                    <motion.circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke="currentColor"
                      className="text-sky-500 dark:text-sky-400 stroke-current"
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={`${Math.max(0, inProgressStroke - gapLength)} ${circumference}`}
                      initial={{ strokeDashoffset: inProgressOffset - halfGap + inProgressStroke }}
                      animate={{ strokeDashoffset: inProgressOffset - halfGap }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}

                  {/* Completed Segment (Dynamic Theme Hex Color) */}
                  {completedPct > 0 && (
                    <motion.circle
                      cx="60"
                      cy="60"
                      r={radius}
                      fill="transparent"
                      stroke={theme.hex}
                      strokeWidth={strokeWidth}
                      strokeLinecap="round"
                      strokeDasharray={`${Math.max(0, completedStroke - gapLength)} ${circumference}`}
                      initial={{ strokeDashoffset: completedStroke - halfGap }}
                      animate={{ strokeDashoffset: -halfGap }}
                      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    />
                  )}
                </svg>

                {/* Inner Text Overlay */}
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-ink-app font-display leading-none">
                    {completedPct}%
                  </span>
                  <span className="text-[10px] font-bold text-muted-soft-app uppercase tracking-widest mt-1">
                    Completed
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Legend items with dots */}
          <div className="grid grid-cols-3 gap-2 border-t border-hairline-soft-app pt-4 mt-2">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-body-app">
                <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: theme.hex }} />
                <span>Completed</span>
              </div>
              <span className="text-xs font-bold text-muted-app mt-0.5">{completedPct}%</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-body-app">
                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 bg-sky-500 dark:bg-sky-400" />
                <span>In Progress</span>
              </div>
              <span className="text-xs font-bold text-muted-app mt-0.5">{inProgressPct}%</span>
            </div>
            <div className="flex flex-col items-center justify-center text-center">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-body-app">
                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0 bg-slate-300 dark:bg-slate-500" />
                <span>Pending</span>
              </div>
              <span className="text-xs font-bold text-muted-app mt-0.5">{pendingPct}%</span>
            </div>
          </div>
        </div>

        {/* Upcoming Tasks List */}
        <div className="bg-surface-app border border-hairline-soft-app rounded-[24px] p-6 flex flex-col justify-between transition-all hover:border-hairline-app lg:col-span-3 min-h-[300px]">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-ink-app font-display tracking-tight">
                Upcoming Tasks
              </h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowScheduleModal(true)}
                  className="p-1.5 rounded-full text-muted-soft-app hover:text-primary-app hover:bg-primary-soft-app/20 transition-all cursor-pointer flex items-center justify-center border border-hairline-soft-app bg-card-app/40"
                  title="Schedule Pending Tasks"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </button>
                {upcomingTasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowUpcomingModal(true)}
                    className={`text-xs font-bold bg-gradient-to-r ${theme.bgGradient} hover:brightness-110 text-white px-4 py-1.5 rounded-full shadow-md shadow-primary-app/10 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center gap-1 cursor-pointer border-0`}
                  >
                    <span>View All</span>
                    <ChevronRight className="w-3.5 h-3.5 text-white" />
                  </button>
                )}
              </div>
            </div>
 
            {/* List */}
            <div className="space-y-5">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-xs text-muted-soft-app font-medium">No upcoming tasks scheduled.</p>
                </div>
              ) : (() => {
                const displayedTasks = upcomingTasks.slice(0, 4);

                interface GroupedUnit {
                  unitName: string;
                  tasks: typeof upcomingTasks;
                }
                const groups: GroupedUnit[] = [];
                displayedTasks.forEach((task) => {
                  const nameOfUnit = task.unitName || "Other Tasks";
                  let group = groups.find((g) => g.unitName === nameOfUnit);
                  if (!group) {
                    group = { unitName: nameOfUnit, tasks: [] };
                    groups.push(group);
                  }
                  group.tasks.push(task);
                });

                return groups.map((group) => (
                  <div key={group.unitName} className="space-y-3">
                    {/* Section Header */}
                    <div className="flex items-center gap-2 px-1 py-1 border-b border-hairline-soft-app/50 dark:border-white/[0.04] mt-2 first:mt-0">
                      <span className="w-1.5 h-3.5 rounded bg-primary-app shrink-0" />
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-app font-sans whitespace-normal break-words" title={group.unitName}>
                        {group.unitName}
                      </h4>
                    </div>

                    {/* Tasks in this Unit */}
                    <div className="space-y-2.5">
                      {group.tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => onNavigate("checklist")}
                          className="flex items-center justify-between gap-4 p-5 bg-card-app/40 border border-hairline-soft-app rounded-2xl hover:border-primary-app/30 cursor-pointer transition-all group min-h-[80px]"
                        >
                          {/* Left Group: Icon + Title */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onToggleTopic && task.unitId && task.topicId) {
                                  onToggleTopic(task.unitId, task.topicId);
                                } else {
                                  onNavigate("checklist");
                                }
                              }}
                              className="relative w-10 h-10 rounded-xl bg-primary-soft-app/20 dark:bg-primary-soft-app/10 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-primary-app hover:text-emerald-500 flex items-center justify-center shrink-0 border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer group/btn"
                              title="Mark Complete"
                            >
                              <BookOpen className="w-5 h-5 absolute group-hover/btn:opacity-0 transition-opacity duration-200" />
                              <Check className="w-5 h-5 absolute opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 stroke-[3]" />
                            </button>

                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-ink-app whitespace-normal break-words leading-relaxed group-hover:text-primary-app transition-colors">
                                {task.topicName}
                              </h4>
                            </div>
                          </div>

                          {/* Right Group: Badge + Edit */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            {(() => {
                              try {
                                const currentYear = new Date().getFullYear();
                                const parsedDate = new Date(`${task.date} ${currentYear}`);
                                if (isNaN(parsedDate.getTime())) {
                                  return (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-soft-app/25 text-primary-app border border-primary-app/10 whitespace-nowrap">
                                      {task.date}
                                    </span>
                                  );
                                }
                                
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                parsedDate.setHours(0, 0, 0, 0);
                                
                                const diffTime = parsedDate.getTime() - today.getTime();
                                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                                
                                if (diffDays < 0) {
                                  return (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 animate-pulse whitespace-nowrap">
                                      Overdue
                                    </span>
                                  );
                                } else if (diffDays === 0) {
                                  return (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 animate-pulse whitespace-nowrap">
                                      Today
                                    </span>
                                  );
                                } else if (diffDays === 1) {
                                  return (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/15 whitespace-nowrap">
                                      Tomorrow
                                    </span>
                                  );
                                } else if (diffDays <= 3) {
                                  return (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-soft-app/25 text-primary-app border border-primary-app/10 whitespace-nowrap">
                                      In {diffDays} days
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-soft-app/15 text-muted-app border border-hairline-soft-app whitespace-nowrap">
                                      {task.date}
                                    </span>
                                  );
                                }
                              } catch (e) {
                                return (
                                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-soft-app/15 text-muted-app border border-hairline-soft-app whitespace-nowrap">
                                    {task.date}
                                  </span>
                                );
                              }
                            })()}
                            {task.unitId && task.topicId && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(task);
                                  }}
                                  className="p-1.5 rounded-lg text-muted-soft-app hover:text-primary-app hover:bg-primary-soft-app/20 transition-all cursor-pointer shrink-0"
                                  title="Edit Target Date & Unit"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Activity Feed */}
      <div className="bg-surface-app border border-hairline-soft-app rounded-[24px] p-6 transition-all hover:border-hairline-app">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-ink-app font-display tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary-app" />
            Recent Activity
          </h3>
          <button
            onClick={() => setShowHistoryModal(true)}
            className={`text-xs font-bold bg-gradient-to-r ${theme.bgGradient} hover:brightness-110 text-white px-4 py-1.5 rounded-full shadow-md shadow-primary-app/10 hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center gap-1 cursor-pointer border-0`}
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        {/* Feed List */}
        <div className="divide-y divide-hairline-soft-app">
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 text-xs font-semibold text-muted-soft-app">
              No recent activity log found. Complete tasks to see history! 🚀
            </div>
          ) : (
            recentActivities.slice(0, 3).map((act) => {
              let iconBg = "bg-status-complete-bg-app text-status-complete-app";
              if (act.type === "note") {
                iconBg = "bg-status-due-soon-bg-app text-status-due-soon-app";
              } else if (act.type === "started") {
                iconBg = "bg-primary-soft-app/20 text-primary-app";
              }

              return (
                <div key={act.id} className="py-4.5 flex items-start gap-4 first:pt-0 last:pb-0">
                  <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                    {act.type === "note" ? (
                      <FileText className="w-4.5 h-4.5" />
                    ) : (
                      <CheckCircle2 className="w-4.5 h-4.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="w-full">
                      <p className="text-xs font-bold text-ink-app whitespace-normal break-normal leading-relaxed">
                        {act.title}
                      </p>
                      <p className="text-[10px] text-muted-app font-semibold whitespace-normal break-normal mt-1 leading-relaxed">
                        {act.detail}
                      </p>
                    </div>

                    <div className="flex items-center justify-end gap-3 mt-2 shrink-0 self-end">
                      <span className="text-[11px] font-bold text-muted-soft-app font-sans whitespace-nowrap">
                        {act.time}
                      </span>
                      {act.type === "completed" && onUndoActivity && (
                        <button
                          type="button"
                          onClick={() => onUndoActivity(act.id)}
                          className="flex items-center gap-1 text-[11px] font-bold text-primary-app hover:text-amber-600 dark:hover:text-amber-500 hover:bg-amber-500/10 px-2 py-1 rounded-lg transition-all cursor-pointer"
                          title="Undo completion"
                        >
                          <Undo className="w-3.5 h-3.5" />
                          <span>Undo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Task Modal */}
      {editingTask && (
        <div 
          id="edit-task-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setEditingTask(null)}
        >
          <div 
            id="edit-task-modal-card"
            className="w-11/12 md:w-2/3 lg:max-w-lg bg-surface-app border border-hairline-app rounded-[24px] shadow-2xl overflow-visible animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-hairline-soft-app flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl ${theme.bgLight} ${theme.text} flex items-center justify-center`}>
                  <Pencil className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-app font-serif">
                    Customize Task
                  </h3>
                  <p className="text-[10px] font-semibold text-muted-soft-app">
                    Edit Unit details and Target Due Date
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="p-1.5 rounded-lg text-muted-soft-app hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (onUpdateTopicAndUnit && editingTask) {
                  onUpdateTopicAndUnit(
                    editingTask.unitId,
                    editingTask.topicId,
                    editingTask.unitName,
                    editingTask.topicName,
                    editingTask.targetDate
                  );
                }
                setEditingTask(null);
              }}
              className="p-6 space-y-4"
            >
              {/* Unit Name Input */}
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-soft-app">
                  Unit Name / Number
                </label>
                <input
                  type="text"
                  required
                  value={editingTask.unitName}
                  onChange={(e) => setEditingTask({ ...editingTask, unitName: e.target.value })}
                  onFocus={() => setShowUnitSuggestions(true)}
                  onBlur={() => setShowUnitSuggestions(false)}
                  placeholder="e.g., Unit 2.0: Time Response Analysis"
                  className="w-full px-3.5 py-2.5 bg-card-app border border-hairline-app rounded-xl text-xs font-bold text-ink-app focus:outline-none focus:border-primary-app transition-colors"
                />
                {showUnitSuggestions && filteredUnits.length > 0 && (
                  <div 
                    className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-surface-app border border-hairline-app rounded-xl shadow-xl divide-y divide-hairline-soft-app/50 scrollbar-none"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {filteredUnits.map((name, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEditingTask({ ...editingTask, unitName: name });
                          setShowUnitSuggestions(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs text-ink-app hover:bg-primary-soft-app/20 active:bg-primary-soft-app/30 font-bold transition-all cursor-pointer block whitespace-normal break-words leading-relaxed border-0"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Topic Name (Editable Input) */}
              <div className="space-y-1 relative">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-soft-app">
                  Topic Title
                </label>
                <input
                  type="text"
                  required
                  value={editingTask.topicName}
                  onChange={(e) => setEditingTask({ ...editingTask, topicName: e.target.value })}
                  onFocus={() => setShowTopicSuggestions(true)}
                  onBlur={() => setShowTopicSuggestions(false)}
                  placeholder="e.g., Introduction to Control Systems"
                  className="w-full px-3.5 py-2.5 bg-card-app border border-hairline-app rounded-xl text-xs font-bold text-ink-app focus:outline-none focus:border-primary-app transition-colors"
                />
                {showTopicSuggestions && filteredTopics.length > 0 && (
                  <div 
                    className="absolute z-50 left-0 right-0 mt-1 max-h-40 overflow-y-auto bg-surface-app border border-hairline-app rounded-xl shadow-xl divide-y divide-hairline-soft-app/50 scrollbar-none"
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    {filteredTopics.map((name, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEditingTask({ ...editingTask, topicName: name });
                          setShowTopicSuggestions(false);
                        }}
                        className="w-full text-left px-3.5 py-2.5 text-xs text-ink-app hover:bg-primary-soft-app/20 active:bg-primary-soft-app/30 font-bold transition-all cursor-pointer block whitespace-normal break-words leading-relaxed border-0"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Target Due Date Input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-soft-app">
                  Target Due Date
                </label>
                <input
                  type="date"
                  value={editingTask.targetDate || ""}
                  onChange={(e) => setEditingTask({ ...editingTask, targetDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-card-app border border-hairline-app rounded-xl text-xs font-bold text-ink-app focus:outline-none focus:border-primary-app transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-hairline-soft-app gap-3 w-full">
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateTopicAndUnit && editingTask) {
                      onUpdateTopicAndUnit(
                        editingTask.unitId,
                        editingTask.topicId,
                        editingTask.unitName,
                        editingTask.topicName,
                        "" // Clear/delete target date
                      );
                    }
                    setEditingTask(null);
                  }}
                  className="w-full sm:w-auto px-3 sm:px-4 py-2 h-10 rounded-full bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] sm:text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border-0 whitespace-nowrap"
                  title="Delete target date from this task"
                  id="btn-delete-target-date"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" />
                  <span>Delete Target Date</span>
                </button>
                <div className="flex flex-row items-center gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setEditingTask(null)}
                    className="flex-1 sm:flex-initial px-3 sm:px-4.5 py-2 h-10 rounded-full border border-hairline-app text-[11px] sm:text-xs font-bold text-muted-soft-app hover:bg-card-strong-app transition-all cursor-pointer whitespace-nowrap text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={`flex-1 sm:flex-initial px-4 sm:px-6 py-2 h-10 rounded-full text-[11px] sm:text-xs font-bold text-white bg-gradient-to-r ${theme.bgGradient} hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-primary-app/10 whitespace-nowrap text-center`}
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Schedule Pending Tasks Modal */}
      {showScheduleModal && (
        <div 
          id="schedule-tasks-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowScheduleModal(false)}
        >
          <div 
            id="schedule-tasks-modal-card"
            className="w-11/12 md:w-3/4 lg:max-w-xl bg-surface-app border border-hairline-app rounded-[24px] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-hairline-soft-app flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl ${theme.bgLight} ${theme.text} flex items-center justify-center`}>
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-app font-serif">
                    Schedule Pending Tasks
                  </h3>
                  <p className="text-[10px] font-semibold text-muted-soft-app">
                    Assign target dates to incomplete topics for "{syllabus?.subjectName || "Active Subject"}"
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 rounded-lg text-muted-soft-app hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              {unscheduledTopics.length === 0 ? (
                <div className="text-center py-8 px-4 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/25 text-emerald-500 flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <h4 className="text-xs font-bold text-ink-app font-serif">All caught up!</h4>
                  <p className="text-[10px] font-semibold text-muted-soft-app max-w-xs mx-auto">
                    All tasks have been scheduled! 🎉 Good job maintaining your roadmap.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-hairline-soft-app">
                  {unscheduledTopics.map((item) => (
                    <div 
                      key={item.topicId} 
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-ink-app truncate">
                          {item.topicName}
                        </h4>
                        <p className="text-[10px] font-semibold text-muted-soft-app truncate mt-0.5">
                          {item.unitName}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2.5 shrink-0">
                        <input
                          type="date"
                          value={scheduleSelectedDates[item.topicId] || ""}
                          onChange={(e) => setScheduleSelectedDates({
                            ...scheduleSelectedDates,
                            [item.topicId]: e.target.value
                          })}
                          className="px-3 py-1.5 bg-card-app border border-hairline-app rounded-xl text-[11px] font-bold text-ink-app focus:outline-none focus:border-primary-app transition-colors cursor-pointer w-[140px]"
                        />
                        <button
                          type="button"
                          disabled={!scheduleSelectedDates[item.topicId]}
                          onClick={() => {
                            if (onUpdateTopicAndUnit) {
                              onUpdateTopicAndUnit(
                                item.unitId,
                                item.topicId,
                                item.unitName,
                                item.topicName,
                                scheduleSelectedDates[item.topicId]
                              );
                            }
                          }}
                          className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold text-white bg-gradient-to-r ${theme.bgGradient} hover:brightness-110 active:scale-[0.97] transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer`}
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>Add</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-card-app/40 border-t border-hairline-soft-app flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowScheduleModal(false)}
                className="px-5 py-2 h-10 rounded-full border border-hairline-app text-xs font-bold text-muted-soft-app hover:bg-card-strong-app transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upcoming Tasks Modal */}
      {showUpcomingModal && (
        <div 
          id="upcoming-tasks-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowUpcomingModal(false)}
        >
          <div 
            id="upcoming-tasks-modal-card"
            className="w-11/12 md:w-3/4 lg:max-w-xl bg-surface-app border border-hairline-app rounded-[24px] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-hairline-soft-app flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl ${theme.bgLight} ${theme.text} flex items-center justify-center`}>
                  <Calendar className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-app font-serif">
                    Upcoming Tasks Schedule
                  </h3>
                  <p className="text-[10px] font-semibold text-muted-soft-app">
                    Dynamic timeline of scheduled learning milestones and targets
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowUpcomingModal(false)}
                className="p-1.5 rounded-lg text-muted-soft-app hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {upcomingTasks.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <p className="text-xs text-muted-soft-app font-medium">No upcoming tasks scheduled.</p>
                </div>
              ) : (() => {
                interface GroupedUnit {
                  unitName: string;
                  tasks: typeof upcomingTasks;
                }
                const groups: GroupedUnit[] = [];
                upcomingTasks.forEach((task) => {
                  const nameOfUnit = task.unitName || "Other Tasks";
                  let group = groups.find((g) => g.unitName === nameOfUnit);
                  if (!group) {
                    group = { unitName: nameOfUnit, tasks: [] };
                    groups.push(group);
                  }
                  group.tasks.push(task);
                });

                return groups.map((group) => (
                  <div key={group.unitName} className="space-y-3">
                    {/* Section Header */}
                    <div className="flex items-center gap-2 px-1 py-1 border-b border-hairline-soft-app/50 dark:border-white/[0.04] mt-2 first:mt-0">
                      <span className="w-1.5 h-3.5 rounded bg-primary-app shrink-0" />
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-muted-app font-sans whitespace-normal break-words" title={group.unitName}>
                        {group.unitName}
                      </h4>
                    </div>

                    {/* Tasks in this Unit */}
                    <div className="space-y-2.5">
                      {group.tasks.map((task) => (
                        <div
                          key={task.id}
                          onClick={() => {
                            setShowUpcomingModal(false);
                            onNavigate("checklist");
                          }}
                          className="flex items-center justify-between gap-4 p-5 bg-card-app/40 border border-hairline-soft-app rounded-2xl hover:border-primary-app/30 cursor-pointer transition-all group min-h-[80px]"
                        >
                          {/* Left Group: Icon + Title */}
                          <div className="flex items-center gap-3.5 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onToggleTopic && task.unitId && task.topicId) {
                                  onToggleTopic(task.unitId, task.topicId);
                                } else {
                                  setShowUpcomingModal(false);
                                  onNavigate("checklist");
                                }
                              }}
                              className="relative w-10 h-10 rounded-xl bg-primary-soft-app/20 dark:bg-primary-soft-app/10 hover:bg-emerald-500/10 dark:hover:bg-emerald-500/20 text-primary-app hover:text-emerald-500 flex items-center justify-center shrink-0 border border-transparent hover:border-emerald-500/30 transition-all cursor-pointer group/btn"
                              title="Mark Complete"
                            >
                              <BookOpen className="w-5 h-5 absolute group-hover/btn:opacity-0 transition-opacity duration-200" />
                              <Check className="w-5 h-5 absolute opacity-0 group-hover/btn:opacity-100 transition-opacity duration-200 stroke-[3]" />
                            </button>

                            <div className="min-w-0 flex-1">
                              <h4 className="text-xs sm:text-sm font-bold text-ink-app whitespace-normal break-words leading-relaxed group-hover:text-primary-app transition-colors">
                                {task.topicName}
                              </h4>
                            </div>
                          </div>

                          {/* Right Group: Badge + Edit */}
                          <div className="flex items-center gap-2.5 shrink-0">
                            {(() => {
                              try {
                                const currentYear = new Date().getFullYear();
                                const parsedDate = new Date(`${task.date} ${currentYear}`);
                                if (isNaN(parsedDate.getTime())) {
                                  return (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-soft-app/25 text-primary-app border border-primary-app/10 whitespace-nowrap">
                                      {task.date}
                                    </span>
                                  );
                                }
                                
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                parsedDate.setHours(0, 0, 0, 0);
                                
                                const diffTime = parsedDate.getTime() - today.getTime();
                                const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
                                
                                if (diffDays < 0) {
                                  return (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-500 dark:text-rose-400 border border-rose-500/20 animate-pulse whitespace-nowrap">
                                      Overdue
                                    </span>
                                  );
                                } else if (diffDays === 0) {
                                  return (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 animate-pulse whitespace-nowrap">
                                      Today
                                    </span>
                                  );
                                } else if (diffDays === 1) {
                                  return (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/15 whitespace-nowrap">
                                      Tomorrow
                                    </span>
                                  );
                                } else if (diffDays <= 3) {
                                  return (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-soft-app/25 text-primary-app border border-primary-app/10 whitespace-nowrap">
                                      In {diffDays} days
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-soft-app/15 text-muted-app border border-hairline-soft-app whitespace-nowrap">
                                      {task.date}
                                    </span>
                                  );
                                }
                              } catch (e) {
                                return (
                                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-primary-soft-app/15 text-muted-app border border-hairline-soft-app whitespace-nowrap">
                                    {task.date}
                                  </span>
                                );
                              }
                            })()}
                            {task.unitId && task.topicId && (
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit(task);
                                  }}
                                  className="p-1.5 rounded-lg text-muted-soft-app hover:text-primary-app hover:bg-primary-soft-app/20 transition-all cursor-pointer shrink-0"
                                  title="Edit Target Date & Unit"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-card-app/40 border-t border-hairline-soft-app flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowUpcomingModal(false)}
                className="px-5 py-2 h-10 rounded-full border border-hairline-app text-xs font-bold text-muted-soft-app hover:bg-card-strong-app transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Activity History Modal */}
      {showHistoryModal && (
        <div 
          id="activity-history-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setShowHistoryModal(false)}
        >
          <div 
            id="activity-history-modal-card"
            className="w-11/12 md:w-3/4 lg:max-w-xl bg-surface-app border border-hairline-app rounded-[24px] shadow-2xl overflow-hidden animate-scale-in flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 pb-4 border-b border-hairline-soft-app flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl ${theme.bgLight} ${theme.text} flex items-center justify-center`}>
                  <Activity className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-ink-app font-serif">
                    Activity History
                  </h3>
                  <p className="text-[10px] font-semibold text-muted-soft-app">
                    Complete history of your learning milestones and actions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg text-muted-soft-app hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {recentActivities.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-900/40 text-muted-soft-app flex items-center justify-center mx-auto">
                    <Activity className="w-6 h-6 stroke-[1.5]" />
                  </div>
                  <h4 className="text-xs font-bold text-ink-app font-serif">No activities yet</h4>
                  <p className="text-[10px] font-semibold text-muted-soft-app max-w-xs mx-auto">
                    Once you start completing topics or adding study notes, they'll show up in this history log! 🚀
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-hairline-soft-app">
                  {recentActivities.map((act) => {
                    let iconBg = "bg-status-complete-bg-app text-status-complete-app";
                    if (act.type === "note") {
                      iconBg = "bg-status-due-soon-bg-app text-status-due-soon-app";
                    } else if (act.type === "started") {
                      iconBg = "bg-primary-soft-app/20 text-primary-app";
                    }

                    return (
                      <div 
                        key={act.id} 
                        className="py-4.5 flex items-start gap-4 first:pt-0 last:pb-0"
                      >
                        <div className={`w-9 h-9 rounded-xl ${iconBg} flex items-center justify-center shrink-0 mt-0.5`}>
                          {act.type === "note" ? (
                            <FileText className="w-4 h-4" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div className="w-full">
                            <p className="text-xs font-bold text-ink-app font-sans whitespace-normal break-normal leading-relaxed">
                              {act.title}
                            </p>
                            <p className="text-[10px] text-muted-app font-semibold whitespace-normal break-normal mt-1 leading-relaxed">
                              {act.detail}
                            </p>
                          </div>

                          <div className="flex items-center justify-end gap-3 mt-2 shrink-0 self-end">
                            <span className="text-[10px] font-bold text-muted-soft-app font-sans whitespace-nowrap">
                              {act.time}
                            </span>
                            {act.type === "completed" && onUndoActivity && (
                              <button
                                type="button"
                                onClick={() => onUndoActivity(act.id)}
                                className="flex items-center gap-1 text-[10px] font-bold text-primary-app hover:text-amber-600 dark:hover:text-amber-500 hover:bg-amber-500/10 px-2 py-1 rounded-lg transition-all cursor-pointer"
                                title="Undo completion"
                              >
                                <Undo className="w-3 h-3" />
                                <span>Undo</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-card-app/40 border-t border-hairline-soft-app flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-5 py-2 h-10 rounded-full border border-hairline-app text-xs font-bold text-muted-soft-app hover:bg-card-strong-app transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

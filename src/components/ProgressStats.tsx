import React, { useState, useEffect } from "react";
import { 
  Flame, 
  Calendar, 
  Target, 
  CheckCircle2, 
  Award, 
  Clock, 
  Trophy, 
  Plus, 
  Sparkles, 
  X, 
  ListTodo, 
  Search, 
  Check, 
  AlertCircle 
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Syllabus, Topic } from "../types";

interface ProgressStatsProps {
  syllabus: Syllabus;
  completedCount: number;
  totalTopicsCount: number;
  completedTodayCount: number;
  onUpdateExamDate: (date: string) => void;
  onUpdateDailyTarget: (target: number) => void;
  onToggleTopic?: (unitId: string, topicId: string) => void;
  onUpdatePlannedTopics?: (ids: string[]) => void;
  primaryColor?: string;
  onAddCourse?: () => void;
}



export default function ProgressStats({
  syllabus,
  completedCount,
  totalTopicsCount,
  completedTodayCount,
  onUpdateExamDate,
  onUpdateDailyTarget,
  onToggleTopic,
  onUpdatePlannedTopics,
  primaryColor = "indigo",
  onAddCourse,
}: ProgressStatsProps) {
  const [editingExamDate, setEditingExamDate] = useState(false);
  const [tempDate, setTempDate] = useState(syllabus?.examDate || "");

  // States for planning today's session
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
  const [selectedPlannedIds, setSelectedPlannedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (syllabus) {
      setTempDate(syllabus.examDate || "");
    }
  }, [syllabus]);

  if (!syllabus) {
    return (
      <div className="relative overflow-hidden bg-gradient-to-b from-indigo-500/[0.04] to-violet-500/[0.04] dark:from-indigo-950/15 dark:to-violet-950/15 border border-primary-app/15 dark:border-primary-app/10 rounded-[28px] p-8 md:p-12 text-center shadow-xl backdrop-blur-md animate-none">
        <div className="absolute top-0 left-1/4 w-48 h-48 bg-primary-app/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-fuchsia-500/5 rounded-full blur-3xl pointer-events-none translate-y-1/2" />

        <div className="relative z-10 max-w-md mx-auto">
          <div className="relative w-20 h-20 mx-auto mb-6 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-primary-app/15 to-violet-500/20 border border-primary-app/25 dark:border-primary-app/20 shadow-[0_8px_24px_-4px_rgba(99,102,241,0.15)] group hover:scale-105 transition-transform duration-300">
            <div className="absolute inset-1 rounded-xl bg-white/40 dark:bg-slate-900/40 backdrop-blur-xs" />
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-primary-app to-violet-500 opacity-20 blur-xs group-hover:opacity-30 transition-opacity duration-300" />
            <Trophy className="w-9 h-9 text-primary-app relative z-10 animate-pulse" />
          </div>

          <h3 className="text-lg md:text-xl font-bold text-ink-app font-serif tracking-tight mb-2.5">
            Unlock Performance Metrics
          </h3>
          <p className="text-xs md:text-sm text-muted-soft-app leading-relaxed font-sans mb-6">
            Get comprehensive, real-time analytics on your study habits, syllabus completion speed, streaks, and target exam countdowns.
          </p>

          {onAddCourse && (
            <button
              type="button"
              onClick={onAddCourse}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-app to-violet-600 hover:from-primary-app/95 hover:to-violet-600/95 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-app/15 hover:shadow-primary-app/25 hover:scale-[1.03] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Upload or Select Syllabus</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            </button>
          )}
        </div>
      </div>
    );
  }

  const percentage = totalTopicsCount > 0 ? Math.round((completedCount / totalTopicsCount) * 100) : 0;
  const remainingCount = totalTopicsCount - completedCount;

  // Countdown calculations
  let countdownText = "No exam date set";
  let daysRemaining: number | null = null;

  if (syllabus.examDate) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exam = new Date(syllabus.examDate);
    exam.setHours(0, 0, 0, 0);

    const diffTime = exam.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysRemaining > 0) {
      countdownText = `${daysRemaining} days remaining`;
    } else if (daysRemaining === 0) {
      countdownText = "Exam is TODAY!";
    } else {
      countdownText = `Exam passed (${Math.abs(daysRemaining)} days ago)`;
    }
  }

  // Helper for dynamic primary colors
  const getPrimaryColorClasses = (color: string) => {
    return {
      bg: "bg-primary-app",
      bgHover: "hover:bg-primary-app/90",
      border: "border-primary-app",
      text: "text-primary-app dark:text-indigo-300",
      bgLight: "bg-primary-soft-app/20",
      borderLight: "border-primary-app/10",
      cardBg: "bg-primary-app",
      cardShadow: "shadow-none",
      cardSub1: "bg-primary-app/20",
      cardSub2: "bg-primary-app/10",
      textLight: "text-white",
      textMuted: "text-white/80",
    };
  };

  const pColor = getPrimaryColorClasses(primaryColor);

  const handleSaveDate = () => {
    onUpdateExamDate(tempDate);
    setEditingExamDate(false);
  };

  // Get list of all topics in the syllabus
  const allSyllabusTopics = syllabus.units.flatMap((unit) =>
    unit.topics.map((topic) => ({
      ...topic,
      unitId: unit.id,
      unitName: unit.name,
    }))
  );

  // Filter planned topics from today's plan
  const plannedTopics = allSyllabusTopics.filter((t) =>
    syllabus.plannedTopicsToday?.includes(t.id)
  );

  const completedPlanned = plannedTopics.filter((t) => t.completed);
  const isGoalCompleted = plannedTopics.length > 0 && plannedTopics.every((t) => t.completed);

  // Unfinished topics list for planning today's session (including already planned but completed ones so they can be modified)
  const unfinishedTopics = allSyllabusTopics.filter(
    (t) => !t.completed || (syllabus.plannedTopicsToday || []).includes(t.id)
  );

  // Modal open trigger
  const handleOpenPlanningModal = () => {
    setSelectedPlannedIds(syllabus.plannedTopicsToday || []);
    setSearchQuery("");
    setIsPlanningModalOpen(true);
  };

  // Modal item toggle
  const handleToggleIdSelection = (id: string) => {
    setSelectedPlannedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // Modal plan confirm
  const handleSavePlan = () => {
    onUpdatePlannedTopics?.(selectedPlannedIds);
    setIsPlanningModalOpen(false);
  };

  // Clear all planned topics
  const handleClearPlan = () => {
    onUpdatePlannedTopics?.([]);
  };

  // Remove single topic from plan
  const handleRemoveFromPlan = (id: string) => {
    const updated = (syllabus.plannedTopicsToday || []).filter((x) => x !== id);
    onUpdatePlannedTopics?.(updated);
  };

  // Filter topics based on search query
  const filteredUnfinished = unfinishedTopics.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.unitName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Split unfinished topics into selected & remaining unselected
  const selectedFiltered = filteredUnfinished.filter((t) =>
    selectedPlannedIds.includes(t.id)
  );
  
  const unselectedFiltered = filteredUnfinished.filter((t) =>
    !selectedPlannedIds.includes(t.id)
  );

  // Group unselected topics by unit
  const groupedUnselected: {
    [key: string]: { unitId: string; unitName: string; topics: typeof unfinishedTopics };
  } = {};

  unselectedFiltered.forEach((topic) => {
    if (!groupedUnselected[topic.unitId]) {
      groupedUnselected[topic.unitId] = {
        unitId: topic.unitId,
        unitName: topic.unitName,
        topics: [],
      };
    }
    groupedUnselected[topic.unitId].topics.push(topic);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* 1. Overall Progress - Dynamic Themed Premium Block */}
      <div className="bg-primary-app border border-primary-app/20 p-6 rounded-[24px] shadow-none flex flex-col justify-between transition-all duration-300 text-white min-h-[220px]">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-white/90 uppercase tracking-widest font-mono">
              Overall Progress
            </span>
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center shrink-0 shadow-none relative">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  className="stroke-white/15 fill-none"
                  strokeWidth="3.5"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.5"
                  className="stroke-white fill-none transition-all duration-500 ease-out"
                  strokeWidth="3.5"
                  strokeDasharray="97.38"
                  strokeDashoffset={97.38 * (1 - percentage / 100)}
                  strokeLinecap="round"
                />
              </svg>
              <Trophy className="w-4.5 h-4.5 text-white z-10" />
            </div>
          </div>

          <div className="text-4xl font-bold font-serif tracking-tight mb-3">
            {percentage}%
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-white/10 p-2.5 rounded-[12px] border border-white/10">
              <div className="text-[10px] text-white/90 font-bold uppercase tracking-wider font-mono">Completed</div>
              <div className="text-base font-black text-white">{completedCount} Topics</div>
            </div>
            <div className="bg-white/5 p-2.5 rounded-[12px] border border-white/5">
              <div className="text-[10px] text-white/70 font-bold uppercase tracking-wider font-mono">Remaining</div>
              <div className="text-base font-black text-white">{remainingCount} Topics</div>
            </div>
          </div>

          {percentage === 100 && (
            <div className="mt-3 bg-amber-400/20 backdrop-blur-md rounded-[12px] p-2.5 border border-amber-300/30 text-white text-center animate-pulse">
              <p className="text-[11px] font-black tracking-wide text-amber-250">
                🏆 SYLLABUS FULLY MASTERED! 🎉
              </p>
            </div>
          )}
        </div>

        {percentage === 100 ? (
          <div className="text-xs font-black text-amber-300 mt-4 flex items-center gap-1.5 border-t border-white/20 pt-3 animate-bounce">
            <span className="text-sm">🎉</span>
            <span>All completed! You are awesome! 🚀</span>
          </div>
        ) : (
          <div className="text-xs text-white/90 mt-4 flex items-center gap-1.5 border-t border-white/15 pt-3 font-medium">
            <Award className="w-4 h-4 text-white" />
            <span>Total Syllabus: {totalTopicsCount} items</span>
          </div>
        )}
      </div>

      {/* 2. Redesigned Today's Session Plan Card */}
      <div className="bg-surface-app border border-hairline-app p-6 rounded-[24px] shadow-none flex flex-col justify-between transition-all duration-300 min-h-[220px]">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-muted-soft-app uppercase tracking-widest font-serif">
              Today's Session Plan
            </span>
            <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/15 dark:border-amber-500/30">
              <Flame className="w-3.5 h-3.5 text-amber-500 fill-amber-500 animate-pulse" />
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-mono">
                {syllabus.streak} Day Streak
              </span>
            </div>
          </div>

          {plannedTopics.length === 0 ? (
            <div className="py-5 text-center flex flex-col items-center justify-center">
              <div className="w-10 h-10 rounded-full bg-primary-soft-app/10 dark:bg-primary-app/10 flex items-center justify-center text-primary-app dark:text-indigo-300 mb-2.5">
                <ListTodo className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-ink-app mb-1 font-serif">Plan Today's Session</h4>
              <p className="text-[11px] text-muted-soft-app max-w-[200px] leading-relaxed mb-3">
                Select unfinished topics from your syllabus to set today's goal and level up your streak!
              </p>
              <button
                onClick={handleOpenPlanningModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-primary-app hover:bg-primary-app/90 text-white rounded-xl text-[11px] font-bold transition-all duration-200 cursor-pointer shadow-sm hover:scale-[1.03] active:scale-[0.98]"
              >
                <Plus className="w-3 h-3" />
                <span>Select Today's Topics</span>
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-4xl font-bold text-ink-app font-serif">
                  {completedPlanned.length}
                </span>
                <span className="text-muted-app/40 text-2xl">/</span>
                <span className="text-xl font-bold text-muted-app font-serif">
                  {plannedTopics.length} DONE
                </span>
              </div>

              {/* Progress Bar of Today's Plan */}
              <div className="w-full bg-card-app rounded-full h-2 mb-3 overflow-hidden border border-hairline-soft-app">
                <div
                  className={`h-full transition-all duration-500 ${
                    isGoalCompleted
                      ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                      : pColor.bg
                  }`}
                  style={{ width: `${(completedPlanned.length / plannedTopics.length) * 100}%` }}
                />
              </div>

              {isGoalCompleted ? (
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/15 dark:border-emerald-500/20 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 animate-bounce" />
                  <span>Goal Achieved! Streak saved today! 🏆</span>
                </div>
              ) : (
                <div className="text-[11px] text-muted-app font-medium mb-3">
                  Complete all {plannedTopics.length - completedPlanned.length} remaining planned topic(s) to secure your streak.
                </div>
              )}

              {/* Mini To-Do List with hover remove controls */}
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 mb-2 scrollbar-thin scrollbar-thumb-hairline scrollbar-track-transparent">
                {plannedTopics.map((topic) => (
                  <div
                    key={topic.id}
                    className="group flex items-center justify-between p-2 rounded-xl border text-[11px] transition-all duration-200 bg-card-app border-hairline-soft-app text-ink-app hover:border-hairline-app"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => onToggleTopic?.(topic.unitId, topic.id)}
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                          topic.completed
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-hairline-app hover:border-primary-app bg-surface-app"
                        }`}
                      >
                        {topic.completed && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>
                      <span className={`font-semibold truncate ${topic.completed ? "text-muted-soft-app line-through opacity-60" : ""}`} title={topic.name}>
                        {topic.name}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveFromPlan(topic.id)}
                      className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus:opacity-100 text-muted-soft-app hover:text-rose-550 p-1 rounded-lg hover:bg-card-hover-app transition-all shrink-0 cursor-pointer"
                      title="Remove from plan"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {plannedTopics.length > 0 && (
          <div className="mt-3 pt-3 border-t border-hairline-soft-app flex items-center justify-between gap-2 shrink-0">
            <button
              onClick={handleOpenPlanningModal}
              className="text-[11px] font-semibold text-muted-soft-app hover:text-primary-app dark:hover:text-indigo-300 transition-colors flex items-center gap-1.5 cursor-pointer bg-card-app hover:bg-card-hover-app border border-hairline-soft-app px-2.5 py-1 rounded-lg"
            >
              <Target className="w-3 h-3 text-muted-app" />
              <span>Modify Plan ({plannedTopics.length})</span>
            </button>
            <button
              onClick={handleClearPlan}
              className="text-[11px] font-semibold text-muted-soft-app hover:text-rose-650 dark:hover:text-rose-400 transition-colors cursor-pointer px-2 py-1 hover:bg-rose-500/5 rounded-lg"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* 3. Exam Countdown - Clean Glassmorphic Block */}
      <div className="bg-surface-app border border-hairline-app p-6 rounded-[24px] shadow-none flex flex-col justify-between transition-all duration-300 min-h-[220px]">
        <div>
          <span className="text-xs font-bold text-muted-soft-app uppercase tracking-widest block mb-4 font-serif">
            Exam Countdown
          </span>

          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3.5 ${pColor.bgLight} rounded-[14px] border border-primary-app/10 ${pColor.text} shadow-none`}>
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <div className="text-3xl font-bold text-ink-app font-serif">
                {daysRemaining !== null ? (
                  <span className={daysRemaining <= 7 && daysRemaining >= 0 ? "text-rose-650 animate-pulse" : ""}>
                    {daysRemaining}
                  </span>
                ) : (
                  <span className={`${pColor.text} text-base font-bold`}>Unscheduled</span>
                )}
              </div>
              <span className="text-xs font-semibold text-muted-soft-app">
                {daysRemaining !== null ? "Days Remaining" : "Set your target test date"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-hairline-soft-app flex items-center justify-between">
          <span className="text-xs text-muted-app">
            {syllabus.examDate ? `Date: ${new Date(syllabus.examDate).toLocaleDateString()}` : "Target exam date:"}
          </span>
          {editingExamDate ? (
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={tempDate}
                onChange={(e) => setTempDate(e.target.value)}
                className="bg-surface-app border border-hairline-app rounded-lg px-2 py-0.5 text-xs text-ink-app focus:outline-none focus:ring-1 focus:ring-primary-app"
              />
              <button
                onClick={handleSaveDate}
                className="px-2.5 py-1 bg-primary-app hover:bg-primary-app/90 text-white rounded-lg text-[11px] font-bold cursor-pointer transition-colors"
              >
                Save
              </button>
              <button
                onClick={() => setEditingExamDate(false)}
                className="text-xs text-muted-soft-app hover:text-ink-app hover:underline px-1 cursor-pointer"
                type="button"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setTempDate(syllabus.examDate || "");
                  setEditingExamDate(true);
                }}
                className={`text-xs ${pColor.text} font-bold hover:underline flex items-center gap-1 cursor-pointer`}
              >
                <Clock className="w-3.5 h-3.5" />
                {syllabus.examDate ? "Edit" : "Set Date"}
              </button>
              {syllabus.examDate && (
                <>
                  <span className="text-muted-app/40">|</span>
                  <button
                    onClick={() => onUpdateExamDate("")}
                    className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold hover:underline cursor-pointer"
                    title="Clear exam date"
                    type="button"
                  >
                    Reset
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 4. Plan Today's Session Custom Accessible Dialog */}
      <AnimatePresence>
        {isPlanningModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPlanningModalOpen(false)}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xl flex flex-col max-h-[85vh] z-10 space-y-4"
            >
              {/* Sticky Header and Search Bar block */}
              <div className="flex flex-col gap-3 shrink-0 border-b border-hairline-soft-app pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 ${pColor.bgLight} rounded-lg ${pColor.text}`}>
                      <Target className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white font-serif">
                        Plan Today's Session
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Select specific unfinished topics to set as your goals today.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsPlanningModalOpen(false)}
                    className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search topics or units..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800/50 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/65 rounded-2xl pl-10 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-app focus:border-primary-app transition-all"
                  />
                </div>
              </div>

              {/* Syllabus Scroll Area - Split Section Design */}
              <div className="flex-1 overflow-y-auto pr-1 py-1 space-y-5 min-h-[150px] scrollbar-thin scrollbar-thumb-hairline scrollbar-track-transparent">
                {unfinishedTopics.length === 0 ? (
                  <div className="py-8 text-center flex flex-col items-center justify-center">
                    <Award className="w-10 h-10 text-amber-500 mb-2 animate-bounce" />
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">All Mastered!</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[240px]">
                      You have completed every single topic in this syllabus. Excellent work!
                    </p>
                  </div>
                ) : filteredUnfinished.length === 0 ? (
                  <div className="py-8 text-center">
                    <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No matching topics found.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Section 1: Today's Selected Targets */}
                    {selectedFiltered.length > 0 && (
                      <div className="space-y-2.5 pb-3 border-b border-dashed border-slate-200 dark:border-slate-800">
                        <h4 className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider font-mono flex items-center gap-1.5 pl-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                          Today's Selected Targets ({selectedFiltered.length})
                        </h4>
                        <div className="grid grid-cols-1 gap-1.5">
                          {selectedFiltered.map((topic) => (
                            <button
                              key={topic.id}
                              onClick={() => handleToggleIdSelection(topic.id)}
                              className="flex items-start gap-3 p-2.5 rounded-xl border text-left text-xs transition-all duration-150 cursor-pointer w-full bg-indigo-500/[0.04] border-indigo-500/25 dark:border-indigo-500/35 text-indigo-900 dark:text-indigo-200"
                            >
                              <div className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all bg-primary-app border-primary-app text-white">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                              <div className="min-w-0">
                                <div className="font-semibold truncate">
                                  {topic.name}
                                </div>
                                <span className="text-[9px] text-muted-soft-app font-medium font-mono uppercase">
                                  {topic.unitName}
                                </span>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Section 2: Remaining Syllabus Topics */}
                    {unselectedFiltered.length > 0 && (
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider font-mono pl-1">
                          Remaining Syllabus Topics ({unselectedFiltered.length})
                        </h4>
                        {Object.values(groupedUnselected).map((group) => (
                          <div key={group.unitId} className="space-y-2">
                            <h5 className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-wider font-mono pl-1.5">
                              {group.unitName}
                            </h5>
                            <div className="grid grid-cols-1 gap-1.5">
                              {group.topics.map((topic) => (
                                <button
                                  key={topic.id}
                                  onClick={() => handleToggleIdSelection(topic.id)}
                                  className="flex items-start gap-3 p-2.5 rounded-xl border text-left text-xs transition-all duration-150 cursor-pointer w-full bg-slate-50/[0.4] dark:bg-slate-800/[0.15] border-slate-200/55 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-200"
                                >
                                  <div className="w-4 h-4 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-all border-slate-300 dark:border-slate-650 bg-white dark:bg-slate-800" />
                                  <div className="min-w-0">
                                    <div className="font-semibold truncate">
                                      {topic.name}
                                    </div>
                                    {topic.completed && (
                                      <span className="inline-flex items-center gap-1 mt-1 text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-550/10 px-1.5 py-0.5 rounded-full">
                                        <Check className="w-2.5 h-2.5" /> Already Completed
                                      </span>
                                    )}
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal footer */}
              <div className="flex items-center justify-between border-t border-hairline-soft-app pt-3 shrink-0">
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {selectedPlannedIds.length} topic(s) selected
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsPlanningModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-650 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePlan}
                    className="px-5 py-2 text-xs font-bold text-white bg-primary-app hover:bg-primary-app/90 rounded-xl shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                  >
                    Confirm Daily Goal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

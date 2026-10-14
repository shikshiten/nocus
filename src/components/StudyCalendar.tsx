import React, { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, CheckCircle2, Award, Clock } from "lucide-react";
import { Syllabus, Topic } from "../types";

interface StudyCalendarProps {
  syllabus: Syllabus | null;
  onUpdateExamDate: (date: string) => void;
}

export default function StudyCalendar({ syllabus, onUpdateExamDate }: StudyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayInfo, setSelectedDayInfo] = useState<string | null>(null);

  // Get completed topics mapped by date string "YYYY-MM-DD"
  const completedTopicsByDate: Record<string, Topic[]> = {};
  if (syllabus) {
    syllabus.units.forEach((unit) => {
      unit.topics.forEach((topic) => {
        if (topic.completed && topic.completedAt) {
          const dateStr = topic.completedAt.split("T")[0]; // YYYY-MM-DD
          if (!completedTopicsByDate[dateStr]) {
            completedTopicsByDate[dateStr] = [];
          }
          completedTopicsByDate[dateStr].push(topic);
        }
      });
    });
  }

  // Calculate exam countdown
  const examDaysLeft = (() => {
    if (!syllabus || !syllabus.examDate) return null;
    const exam = new Date(syllabus.examDate);
    exam.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = exam.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  })();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Calendar calculations
  const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0 (Sun) - 6 (Sat)
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate day cells
  const days = [];
  // Padding cells for previous month
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push({ day: null, key: `empty-${i}` });
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(year, month, d);
    // Format to local YYYY-MM-DD string safely (adjusting for local timezone offset)
    const offset = dateObj.getTimezoneOffset();
    const adjustedDate = new Date(dateObj.getTime() - (offset * 60 * 1000));
    const dateStr = adjustedDate.toISOString().split("T")[0];
    
    days.push({
      day: d,
      dateStr,
      isToday: new Date().toDateString() === dateObj.toDateString(),
      isExamDate: syllabus ? (syllabus.examDate === dateStr) : false,
      completedCount: completedTopicsByDate[dateStr]?.length || 0,
      topics: completedTopicsByDate[dateStr] || [],
      key: `day-${d}`
    });
  }

  const handleDayClick = (dayData: any) => {
    if (!dayData.day) return;
    if (dayData.topics.length > 0) {
      setSelectedDayInfo(dayData.dateStr);
    } else {
      // Toggle setting this day as exam date
      if (syllabus) {
        onUpdateExamDate(dayData.dateStr);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Countdown bar */}
      <div className="bg-surface-app border border-hairline-app p-6 rounded-[24px] shadow-none flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-soft-app/20 flex items-center justify-center text-primary-app">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-ink-app font-serif">
              Exam Countdown Target
            </h3>
            <p className="text-[11px] font-semibold text-muted-soft-app">
              {syllabus && syllabus.examDate 
                ? `Target Exam Date: ${new Date(syllabus.examDate).toLocaleDateString("en-US", { day: 'numeric', month: 'long', year: 'numeric' })}` 
                : "No exam date set yet. Click any calendar cell to lock it in!"}
            </p>
          </div>
        </div>

        {syllabus && syllabus.examDate ? (
          <div className="flex items-center gap-3">
            <div className={`px-4.5 py-2.5 rounded-2xl flex items-center gap-2 font-serif font-bold text-xs ${
              examDaysLeft !== null && examDaysLeft <= 7 
                ? "bg-rose-50 text-rose-600 border border-rose-500/10"
                : examDaysLeft !== null && examDaysLeft < 0 
                ? "bg-card-app text-muted-soft-app"
                : "bg-primary-soft-app/20 text-primary-app border border-primary-app/10"
            }`}>
              {examDaysLeft !== null && examDaysLeft > 0 ? (
                <>
                  <span className="text-lg">{examDaysLeft}</span>
                  <span>Days remaining</span>
                </>
              ) : examDaysLeft !== null && examDaysLeft === 0 ? (
                <span>EXAM DAY TODAY! 🏁</span>
              ) : (
                <span>Exam completed 🎓</span>
              )}
            </div>
            
            <button
              onClick={() => onUpdateExamDate("")}
              className="text-xs font-bold text-rose-500 hover:text-rose-600 cursor-pointer p-2"
            >
              Clear
            </button>
          </div>
        ) : (
          <div className="text-xs font-bold text-muted-app bg-card-app px-4 py-2.5 rounded-2xl border border-hairline-soft-app">
            {syllabus ? "Tip: Select a target exam date on the calendar below!" : "Connect a syllabus to set custom exam targets!"}
          </div>
        )}
      </div>

      {/* Main Calendar Body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-surface-app border border-hairline-app p-6 rounded-[24px] shadow-none lg:col-span-2">
          {/* Calendar Month Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <CalendarIcon className="w-5 h-5 text-primary-app" />
              <h3 className="text-sm font-bold text-ink-app font-serif uppercase tracking-wider">
                {monthNames[month]} {year}
              </h3>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePrevMonth}
                className="p-2 rounded-xl bg-card-app hover:bg-card-app/80 text-ink-app border border-hairline-app cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={handleNextMonth}
                className="p-2 rounded-xl bg-card-app hover:bg-card-app/80 text-ink-app border border-hairline-app cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Weekdays Row */}
          <div className="grid grid-cols-7 gap-2 text-center mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
              <span key={dayName} className="text-[10px] font-black uppercase text-muted-soft-app tracking-wider">
                {dayName}
              </span>
            ))}
          </div>

          {/* Grid of Days */}
          <div className="grid grid-cols-7 gap-2.5">
            {days.map((dayData) => {
              if (dayData.day === null) {
                return <div key={dayData.key} className="aspect-square bg-transparent rounded-2xl" />;
              }

              const hasCompletions = dayData.completedCount > 0;

              return (
                <button
                  key={dayData.key}
                  onClick={() => handleDayClick(dayData)}
                  className={`aspect-square rounded-2xl border flex flex-col items-center justify-between p-2 relative group cursor-pointer transition-all ${
                    dayData.isToday
                      ? "bg-primary-app border-primary-app text-white shadow-none"
                      : dayData.isExamDate
                      ? "bg-rose-500 border-rose-500 text-white shadow-none"
                      : hasCompletions
                      ? "bg-emerald-50/50 border-emerald-500/30 text-ink-app hover:border-emerald-500/60"
                      : "bg-card-app border-hairline-soft-app text-ink-app hover:bg-card-app/80"
                  }`}
                  title={dayData.isExamDate ? "Target Exam Date" : hasCompletions ? `${dayData.completedCount} Topics Completed` : (syllabus ? "Set exam date" : "Upload a syllabus to interact")}
                >
                  {/* Day Number */}
                  <span className={`text-xs font-bold self-start ${
                    dayData.isToday || dayData.isExamDate
                      ? "text-white"
                      : "text-ink-app"
                  }`}>
                    {dayData.day}
                  </span>

                  {/* Indicators */}
                  <div className="flex items-center justify-center gap-1">
                    {hasCompletions && (
                      <span className={`w-1.5 h-1.5 rounded-full ${dayData.isToday || dayData.isExamDate ? "bg-white" : "bg-emerald-500"}`} />
                    )}
                    {dayData.isExamDate && !dayData.isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Day details or Exam card sidepanel */}
        <div className="bg-surface-app border border-hairline-app p-6 rounded-[24px] shadow-none flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-ink-app font-serif tracking-tight mb-4 flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-primary-app" />
              Completions Log
            </h4>

            {selectedDayInfo && syllabus ? (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between border-b border-hairline-soft-app pb-2">
                  <span className="text-xs font-bold text-ink-app">
                    {new Date(selectedDayInfo).toLocaleDateString("en-US", { day: 'numeric', month: 'short' })}
                  </span>
                  <button
                    onClick={() => setSelectedDayInfo(null)}
                    className="text-[10px] font-bold text-primary-app"
                  >
                    Clear Filter
                  </button>
                </div>

                <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                  {syllabus.units.flatMap(u => u.topics.filter(t => t.completed && t.completedAt && t.completedAt.split("T")[0] === selectedDayInfo)).map(topic => (
                    <div key={topic.id} className="flex items-center gap-2 text-xs bg-card-app p-2.5 rounded-xl border border-hairline-soft-app">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="text-ink-app font-medium truncate">{topic.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-10 space-y-2">
                <p className="text-xs text-muted-app font-medium leading-relaxed">
                  {syllabus 
                    ? "Click any green highlighted calendar day to inspect exactly what topics you completed on that date!" 
                    : "Always interactive! Upload or select a syllabus to start logging completed milestones on specific dates."}
                </p>
                <div className="w-12 h-12 rounded-full bg-primary-soft-app/20 flex items-center justify-center text-primary-app mx-auto">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-hairline-soft-app pt-4 mt-4">
            <h5 className="text-[10px] font-black uppercase text-muted-soft-app tracking-wider mb-2">Calendar Key</h5>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-muted-app">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-primary-app rounded-lg inline-block" />
                <span>Today</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-rose-500 rounded-lg inline-block" />
                <span>Exam Target</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 bg-emerald-50 border border-emerald-500/30 rounded-lg inline-block" />
                <span>Completions</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

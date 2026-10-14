import React, { useState } from "react";
import { Search, FolderOpen, ChevronDown, ChevronRight, FileText, PlusCircle, Star, Check } from "lucide-react";
import { Syllabus, Unit, Topic } from "../types";

interface SyllabusChecklistProps {
  syllabus: Syllabus;
  onToggleTopic: (unitId: string, topicId: string) => void;
  onUpdateTopicNotes: (unitId: string, topicId: string, notes: string) => void;
  onToggleBookmark?: (unitId: string, topicId: string) => void;
  onToggleUnitBookmark?: (unitId: string) => void;
}

export default function SyllabusChecklist({
  syllabus,
  onToggleTopic,
  onUpdateTopicNotes,
  onToggleBookmark,
  onToggleUnitBookmark,
}: SyllabusChecklistProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "completed" | "remaining">("all");
  const [collapsedUnits, setCollapsedUnits] = useState<Record<string, boolean>>({});
  
  // Note editing state
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  if (!syllabus) {
    return (
      <div className="bg-surface-app border border-hairline-app rounded-[24px] p-8 text-center">
        <FolderOpen className="w-12 h-12 text-muted-soft-app mx-auto mb-3" />
        <p className="text-muted-app text-sm font-medium">Please select or upload a syllabus first to view your checklist.</p>
      </div>
    );
  }

  const toggleUnitCollapse = (unitId: string) => {
    setCollapsedUnits((prev) => ({
      ...prev,
      [unitId]: !prev[unitId],
    }));
  };

  // Filter units and topics based on search query and active filter tab
  const getFilteredUnits = (): Unit[] => {
    return syllabus.units
      .map((unit) => {
        const filteredTopics = unit.topics.filter((topic) => {
          // Search query filter
          const matchesSearch =
            topic.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
            (topic.notes && topic.notes.toLowerCase().includes(searchQuery.toLowerCase()));

          // Status filter
          let matchesFilter = true;
          if (activeFilter === "completed") {
            matchesFilter = topic.completed;
          } else if (activeFilter === "remaining") {
            matchesFilter = !topic.completed;
          }

          return matchesSearch && matchesFilter;
        });

        return {
          ...unit,
          topics: filteredTopics,
        };
      })
      .filter((unit) => unit.topics.length > 0);
  };

  const filteredUnits = getFilteredUnits();

  // Helper to count totals from current syllabus state
  const getUnitProgress = (unit: Unit) => {
    const total = unit.topics.length;
    const completed = unit.topics.filter((t) => t.completed).length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pct };
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header with Search and Filters */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border-b border-hairline-soft-app pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink-app font-serif flex items-center gap-2.5">
            <FolderOpen className="w-5 h-5 text-primary-app shrink-0" />
            Subject Curriculum
          </h2>
          <p className="text-xs text-muted-soft-app mt-1">
            Browse and check off syllabus topics as you study them.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto md:max-w-md shrink-0">
          {/* Quick Filter Tabs */}
          <div className="flex border border-hairline-app rounded-full p-0.5 bg-card-app self-start">
            {(["all", "completed", "remaining"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider transition-colors cursor-pointer ${
                  activeFilter === filter
                    ? "bg-primary-app text-white"
                    : "text-muted-app hover:text-ink-app"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative grow">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-soft-app" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search topics or notes..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-surface-app text-ink-app border border-hairline-app rounded-full focus:outline-none focus:ring-1 focus:ring-primary-app/40 focus:border-primary-app transition-all placeholder:text-muted-soft-app font-medium"
            />
          </div>
        </div>
      </div>

      {/* Units & Topics List */}
      {filteredUnits.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-hairline-app rounded-2xl bg-card-app/35">
          <p className="text-muted-app text-xs font-serif italic">
            {searchQuery || activeFilter !== "all"
              ? "No topics match your current search queries or filters."
              : "No units found. Click 'Add Subject' to upload or generate your curriculum checklist."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUnits.map((unit) => {
            const isCollapsed = collapsedUnits[unit.id];
            const { completed, total, pct } = getUnitProgress(unit);

            return (
              <div
                key={unit.id}
                className="border border-hairline-app rounded-2xl overflow-hidden bg-surface-app"
              >
                {/* Unit Header */}
                <div
                  onClick={() => toggleUnitCollapse(unit.id)}
                  className="flex items-center justify-between p-4 bg-card-app/60 hover:bg-card-app cursor-pointer transition-colors select-none gap-2"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-soft-app shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-soft-app shrink-0" />
                    )}
                    <h3 className="text-xs font-bold text-ink-app uppercase tracking-wider font-sans truncate">
                      {unit.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {onToggleUnitBookmark && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleUnitBookmark(unit.id);
                        }}
                        className={`p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                          unit.bookmarked
                            ? "bg-primary-soft-app/30 text-primary-app border-primary-app/30"
                            : "bg-transparent text-muted-soft-app hover:text-ink-app border-transparent hover:bg-card-strong-app"
                        }`}
                        title={unit.bookmarked ? "Bookmarked unit" : "Bookmark unit"}
                      >
                        <Star className={`w-3.5 h-3.5 ${unit.bookmarked ? 'fill-primary-app text-primary-app' : ''}`} />
                      </button>
                    )}

                    <div className="hidden sm:flex items-center gap-2">
                      <div className="w-16 bg-card-strong-app rounded-full h-1 overflow-hidden">
                        <div className="h-full bg-primary-app" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[10px] font-bold text-muted-soft-app">{pct}%</span>
                    </div>
                    <span className="text-[10px] font-bold bg-primary-soft-app/25 text-primary-app px-2.5 py-1 rounded-md border border-primary-app/10 whitespace-nowrap">
                      {completed} / {total} DONE
                    </span>
                  </div>
                </div>

                {/* Topics List */}
                {!isCollapsed && (
                  <div className="bg-transparent pb-3">
                    {/* Minimalist Linear Progress Bar */}
                    <div className="px-5 py-4 border-b border-hairline-soft-app bg-card-app/20">
                      <div className="flex items-center justify-between gap-3 mb-2.5">
                        <span className="text-[11px] font-bold tracking-wider uppercase text-muted-soft-app flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-primary-app animate-pulse inline-block" />
                          Unit Progress
                        </span>
                        <div className="text-xs font-semibold text-ink-app">
                          <span className="font-bold text-primary-app">{pct}% Completed</span>
                          <span className="text-muted-soft-app font-normal mx-1.5">•</span>
                          <span className="text-muted-app font-medium">{completed}/{total} Topics</span>
                        </div>
                      </div>
                      
                      {/* Progress Track & Fill */}
                      <div className="w-full h-2.5 bg-card-strong-app/70 dark:bg-slate-800/80 rounded-full overflow-hidden p-0.5 border border-hairline-soft-app">
                        <div
                          className="h-full bg-gradient-to-r from-primary-app via-indigo-500 to-emerald-500 rounded-full transition-all duration-500 ease-out shadow-xs"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="divide-y divide-hairline-soft-app bg-transparent px-4 pt-1">
                      {unit.topics.map((topic, index) => {
                      // Determine if it is the "Next up" topic
                      const isNextUp = !topic.completed && unit.topics.findIndex(t => !t.completed) === index;

                      return (
                        <div
                          key={topic.id}
                          className={`flex flex-col my-2 rounded-xl border transition-all duration-150 overflow-hidden ${
                            topic.completed
                              ? "bg-card-app/10 border-transparent"
                              : isNextUp
                              ? "bg-surface-app border-primary-app shadow-xs"
                              : "bg-surface-app border-hairline-soft-app hover:bg-card-app/15"
                          }`}
                        >
                          {/* Row Header */}
                          <div
                            onClick={() => onToggleTopic(unit.id, topic.id)}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 cursor-pointer select-none gap-3"
                          >
                            <div className="flex items-start gap-3 pr-0 sm:pr-4 grow min-w-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleTopic(unit.id, topic.id);
                                }}
                                className="text-muted-soft-app hover:text-primary-app transition-colors shrink-0 mt-0.5"
                              >
                                {topic.completed ? (
                                  <div className="w-4.5 h-4.5 bg-primary-app rounded flex items-center justify-center">
                                    <Check className="text-white w-3 h-3 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className={`w-4.5 h-4.5 border rounded ${isNextUp ? 'border-primary-app/70' : 'border-hairline-app'}`} />
                                )}
                              </button>
                              
                              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                                <div className="flex flex-row items-center justify-between gap-2 w-full">
                                  <span
                                    className={`text-xs font-semibold transition-all break-words ${
                                      topic.completed
                                        ? "text-muted-app dark:text-muted-app/85 line-through font-medium"
                                        : isNextUp
                                        ? "text-primary-app font-bold"
                                        : "text-ink-app"
                                    }`}
                                  >
                                    {topic.name}
                                  </span>

                                  {/* Mobile action buttons container: right side of the task name */}
                                  <div className="flex sm:hidden items-center gap-1.5 shrink-0 ml-2">
                                    {/* Notes button */}
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (editingTopicId === topic.id) {
                                          setEditingTopicId(null);
                                        } else {
                                          setEditingTopicId(topic.id);
                                          setNoteText(topic.notes || "");
                                        }
                                      }}
                                      className={`p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                                        editingTopicId === topic.id
                                          ? "bg-primary-soft-app text-primary-app border-primary-app/20"
                                          : topic.notes
                                          ? "bg-card-app text-primary-app border-hairline-app"
                                          : "bg-transparent text-muted-soft-app hover:text-ink-app border-transparent hover:bg-card-app"
                                      }`}
                                      title={topic.notes ? "Edit study note" : "Add study note"}
                                    >
                                      {topic.notes ? (
                                        <FileText className="w-3 h-3 text-primary-app" />
                                      ) : (
                                        <PlusCircle className="w-3 h-3" />
                                      )}
                                    </button>

                                    {onToggleBookmark && (
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onToggleBookmark(unit.id, topic.id);
                                        }}
                                        className={`p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                                          (topic as any).bookmarked
                                            ? "bg-primary-soft-app text-primary-app border-primary-app/20"
                                            : "bg-transparent text-muted-soft-app hover:text-ink-app border-transparent hover:bg-card-app"
                                        }`}
                                        title={(topic as any).bookmarked ? "Bookmarked" : "Bookmark topic"}
                                      >
                                        <Star className={`w-3.5 h-3.5 ${(topic as any).bookmarked ? 'fill-primary-app text-primary-app' : ''}`} />
                                      </button>
                                    )}

                                    {topic.completed ? (
                                      <span className="text-[8px] font-bold bg-green-500/10 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                        Done
                                      </span>
                                    ) : isNextUp ? (
                                      <span className="text-[8px] font-bold bg-primary-soft-app text-primary-app px-1.5 py-0.5 rounded-md uppercase tracking-wider">
                                        Next Up
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                
                                {/* Saved note display */}
                                {topic.notes && editingTopicId !== topic.id && (
                                  <span className="text-[11px] text-muted-app font-medium flex items-center gap-1.5 mt-1.5 bg-card-app/40 px-2 py-0.5 rounded-md w-fit border border-hairline-soft-app">
                                    <FileText className="w-3 h-3 text-primary-app/80 shrink-0" />
                                    <span className="truncate max-w-[180px] sm:max-w-md font-mono text-[10px]">{topic.notes}</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="hidden sm:flex items-center gap-2 shrink-0 self-start sm:self-center pl-7 sm:pl-0">
                              {/* Notes button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (editingTopicId === topic.id) {
                                    setEditingTopicId(null);
                                  } else {
                                    setEditingTopicId(topic.id);
                                    setNoteText(topic.notes || "");
                                  }
                                }}
                                className={`p-1.5 rounded-lg border transition-all flex items-center gap-1 text-[10px] font-bold cursor-pointer ${
                                  editingTopicId === topic.id
                                    ? "bg-primary-soft-app text-primary-app border-primary-app/20"
                                    : topic.notes
                                    ? "bg-card-app text-primary-app border-hairline-app"
                                    : "bg-transparent text-muted-soft-app hover:text-ink-app border-transparent hover:bg-card-app"
                                }`}
                                title={topic.notes ? "Edit study note" : "Add study note"}
                              >
                                {topic.notes ? (
                                  <>
                                    <FileText className="w-3 h-3 text-primary-app" />
                                    <span className="hidden sm:inline">Note</span>
                                  </>
                                ) : (
                                  <>
                                    <PlusCircle className="w-3 h-3" />
                                    <span className="hidden sm:inline">Add Note</span>
                                  </>
                                )}
                              </button>

                              {onToggleBookmark && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleBookmark(unit.id, topic.id);
                                  }}
                                  className={`p-1.5 rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                                    (topic as any).bookmarked
                                      ? "bg-primary-soft-app text-primary-app border-primary-app/20"
                                      : "bg-transparent text-muted-soft-app hover:text-ink-app border-transparent hover:bg-card-app"
                                  }`}
                                  title={(topic as any).bookmarked ? "Bookmarked" : "Bookmark topic"}
                                >
                                  <Star className={`w-3.5 h-3.5 ${(topic as any).bookmarked ? 'fill-primary-app text-primary-app' : ''}`} />
                                </button>
                              )}

                              {topic.completed ? (
                                <span className="text-[9px] font-bold bg-green-500/10 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  Done
                                </span>
                              ) : isNextUp ? (
                                <span className="text-[9px] font-bold bg-primary-soft-app text-primary-app px-2 py-0.5 rounded-md uppercase tracking-wider">
                                  Next Up
                                </span>
                              ) : null}
                            </div>
                          </div>

                          {/* Expanded Notes Input form */}
                          {editingTopicId === topic.id && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="border-t border-hairline-soft-app bg-card-app/25 p-3.5 space-y-2.5 animate-in slide-in-from-top-1 duration-150"
                            >
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-muted-app flex items-center gap-1.5 uppercase tracking-wider">
                                  <FileText className="w-3.5 h-3.5 text-primary-app" />
                                  Study Note / Reminder
                                </label>
                                {topic.notes && (
                                  <button
                                    onClick={() => {
                                      onUpdateTopicNotes(unit.id, topic.id, "");
                                      setEditingTopicId(null);
                                    }}
                                    className="text-[10px] font-bold text-red-500 hover:text-red-600 transition-colors"
                                  >
                                    Clear Note
                                  </button>
                                )}
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  type="text"
                                  value={noteText}
                                  onChange={(e) => setNoteText(e.target.value)}
                                  placeholder="e.g. Read Chapter 4, study formula sheet on p.45..."
                                  className="flex-1 px-3 py-2 text-xs bg-surface-app border border-hairline-app rounded-xl text-ink-app placeholder:text-muted-soft-app focus:outline-none focus:ring-1 focus:ring-primary-app focus:border-primary-app transition-all min-w-0"
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      onUpdateTopicNotes(unit.id, topic.id, noteText);
                                      setEditingTopicId(null);
                                    } else if (e.key === "Escape") {
                                      setEditingTopicId(null);
                                    }
                                  }}
                                  autoFocus
                                />
                                <div className="flex items-center justify-end gap-2 shrink-0">
                                  <button
                                    onClick={() => {
                                      onUpdateTopicNotes(unit.id, topic.id, noteText);
                                      setEditingTopicId(null);
                                    }}
                                    className="px-4 py-2 bg-primary-app hover:bg-opacity-90 text-white text-xs font-bold rounded-xl transition-all text-center justify-center flex cursor-pointer"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingTopicId(null)}
                                    className="px-3 py-2 border border-hairline-app hover:bg-card-app text-muted-app text-xs font-bold rounded-xl transition-all text-center justify-center flex cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

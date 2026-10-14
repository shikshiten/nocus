import React from "react";
import { Bookmark, FileText, CheckCircle2, Star, Trash2, FolderOpen } from "lucide-react";
import { Syllabus, Topic, KeepNote } from "../types";

interface BookmarksViewProps {
  syllabus: Syllabus | null;
  onToggleTopic: (unitId: string, topicId: string) => void;
  onToggleBookmark: (unitId: string, topicId: string) => void;
  onToggleUnitBookmark?: (unitId: string) => void;
}

export default function BookmarksView({ syllabus, onToggleTopic, onToggleBookmark, onToggleUnitBookmark }: BookmarksViewProps) {
  if (!syllabus) {
    return (
      <div className="bg-white dark:bg-[#111625] border border-slate-200/50 dark:border-white/[0.05] rounded-[24px] p-8 text-center">
        <p className="text-slate-400 dark:text-slate-500 text-sm">Please select or upload a syllabus first to view bookmarks.</p>
      </div>
    );
  }

  // Get all bookmarked topics
  const bookmarkedTopics: Array<{ unitId: string; unitName: string; topic: Topic }> = [];
  syllabus.units.forEach((unit) => {
    unit.topics.forEach((topic) => {
      // Treat topics as bookmarked if we add explicit bookmark field, or if they have notes (active studying)
      // Let's check for explicit "bookmarked" boolean in topic
      if ((topic as any).bookmarked) {
        bookmarkedTopics.push({
          unitId: unit.id,
          unitName: unit.name,
          topic,
        });
      }
    });
  });

  // Get all bookmarked units
  const bookmarkedUnits = syllabus.units.filter((unit) => unit.bookmarked);

  // Get all pinned keep notes
  const pinnedNotes = syllabus.keepNotes?.filter((note) => note.isPinned) || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-ink-app font-serif flex items-center gap-2">
          <Bookmark className="w-5 h-5 text-primary-app" />
          Study Bookmarks
        </h2>
        <p className="text-xs text-muted-soft-app mt-1">
          Your pinned study notes and bookmarked curriculum chapters all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bookmarked Topics Section */}
        <div className="bg-surface-app border border-hairline-soft-app p-6 rounded-[24px] shadow-none space-y-4">
          <h3 className="text-sm font-bold text-ink-app font-serif uppercase tracking-wider border-b border-hairline-soft-app pb-2">
            Bookmarked Curriculum ({bookmarkedUnits.length + bookmarkedTopics.length})
          </h3>

          {bookmarkedUnits.length === 0 && bookmarkedTopics.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <Star className="w-8 h-8 text-muted-soft-app mx-auto" />
              <p className="text-xs text-muted-app font-semibold">
                No units or topics bookmarked yet. Bookmark them from the Syllabus Checklist tab!
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {/* Bookmarked Units */}
              {bookmarkedUnits.map((unit) => (
                <div
                  key={unit.id}
                  className="p-3.5 bg-primary-soft-app/10 border border-primary-app/10 rounded-2xl flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-2 bg-primary-soft-app/20 rounded-xl text-primary-app">
                      <FolderOpen className="w-4 h-4" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-xs font-bold text-ink-app truncate">
                        {unit.name}
                      </h4>
                      <p className="text-[9px] uppercase tracking-wider font-semibold text-primary-app mt-0.5">
                        Bookmarked Unit
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleUnitBookmark && onToggleUnitBookmark(unit.id)}
                    className="text-amber-500 hover:text-muted-app transition-colors p-1 cursor-pointer"
                    title="Remove Bookmark"
                  >
                    <Star className="w-4 h-4 fill-amber-500" />
                  </button>
                </div>
              ))}

              {/* Bookmarked Topics */}
              {bookmarkedTopics.map(({ unitId, unitName, topic }) => (
                <div
                  key={topic.id}
                  className="p-3.5 bg-card-app border border-hairline-soft-app rounded-2xl flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <button
                      onClick={() => onToggleTopic(unitId, topic.id)}
                      className="text-muted-soft-app hover:text-primary-app transition-colors shrink-0 cursor-pointer"
                    >
                      {topic.completed ? (
                        <div className="w-5 h-5 bg-primary-app rounded flex items-center justify-center">
                          <svg className="text-white" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        </div>
                      ) : (
                        <div className="w-5 h-5 border-2 rounded border-hairline-app" />
                      )}
                    </button>

                    <div className="overflow-hidden">
                      <h4 className={`text-xs font-bold truncate ${topic.completed ? "text-muted-soft-app line-through font-normal" : "text-ink-app"}`}>
                        {topic.name}
                      </h4>
                      <p className="text-[9px] uppercase tracking-wider font-semibold text-muted-soft-app mt-0.5 truncate">
                        {unitName}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => onToggleBookmark(unitId, topic.id)}
                    className="text-amber-500 hover:text-muted-soft-app transition-colors p-1 cursor-pointer"
                    title="Remove Bookmark"
                  >
                    <Star className="w-4 h-4 fill-amber-500" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pinned Keep Notes Section */}
        <div className="bg-surface-app border border-hairline-soft-app p-6 rounded-[24px] shadow-none space-y-4">
          <h3 className="text-sm font-bold text-ink-app font-serif uppercase tracking-wider border-b border-hairline-soft-app pb-2">
            Pinned Notes ({pinnedNotes.length})
          </h3>

          {pinnedNotes.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <FileText className="w-8 h-8 text-muted-soft-app mx-auto" />
              <p className="text-xs text-muted-app font-semibold">
                No pinned study notes yet. Pin notes in the Keep Study Notes tab to lock them here!
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
              {pinnedNotes.map((note) => (
                <div
                  key={note.id}
                  className="p-4 bg-card-app border border-hairline-soft-app rounded-2xl relative overflow-hidden"
                >
                  <h4 className="text-xs font-bold font-serif text-ink-app flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary-app" />
                    {note.title || "Untitled Note"}
                  </h4>
                  <p className="text-[11px] text-muted-app font-medium leading-relaxed mt-2 pl-4">
                    {note.content}
                  </p>
                  <span className="text-[9px] font-bold text-muted-soft-app block text-right mt-3 pl-4">
                    {new Date(note.createdAt).toLocaleDateString("en-US", { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

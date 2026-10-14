import React, { useState, useRef, useEffect } from "react";
import { 
  Pin, 
  Trash2, 
  Palette, 
  Check, 
  Plus, 
  Search, 
  X, 
  Edit3, 
  FileText,
  AlertCircle
} from "lucide-react";
import { KeepNote } from "../types";
import { AnimatePresence, motion } from "motion/react";

interface KeepNotesProps {
  notes: KeepNote[];
  onAddNote: (note: Omit<KeepNote, "id" | "createdAt">) => void;
  onUpdateNote: (note: KeepNote) => void;
  onDeleteNote: (id: string) => void;
}

const COLOR_OPTIONS = [
  { id: "default", name: "Default", bgClass: "bg-surface-app", borderClass: "border-hairline-app", dotClass: "bg-[#FBF9F3] border-hairline-app" },
  { id: "rose", name: "Coral Rose", bgClass: "bg-rose-50 dark:bg-[#251214]", borderClass: "border-rose-200 dark:border-rose-950", dotClass: "bg-rose-300 dark:bg-rose-800 border-rose-400" },
  { id: "amber", name: "Warm Amber", bgClass: "bg-amber-50 dark:bg-[#261B09]", borderClass: "border-amber-200 dark:border-amber-950", dotClass: "bg-amber-300 dark:bg-amber-800 border-amber-400" },
  { id: "emerald", name: "Mint Emerald", bgClass: "bg-emerald-50 dark:bg-[#0C2417]", borderClass: "border-emerald-200 dark:border-emerald-950", dotClass: "bg-emerald-300 dark:bg-emerald-800 border-emerald-400" },
  { id: "teal", name: "Teal Green", bgClass: "bg-teal-50 dark:bg-[#092323]", borderClass: "border-teal-200 dark:border-teal-950", dotClass: "bg-teal-300 dark:bg-teal-800 border-teal-400" },
  { id: "terracotta", name: "Terracotta", bgClass: "bg-primary-soft-app dark:bg-[#1D1236]", borderClass: "border-primary-soft-app dark:border-indigo-950", dotClass: "bg-primary-app/60 dark:bg-indigo-900 border-primary-app/80" },
  { id: "sand", name: "Warm Sand", bgClass: "bg-card-app dark:bg-[#1C1824]", borderClass: "border-card-strong-app dark:border-slate-800", dotClass: "bg-muted-soft border-muted" },
  { id: "purple", name: "Purple Sage", bgClass: "bg-purple-50 dark:bg-[#1C112C]", borderClass: "border-purple-200 dark:border-purple-950", dotClass: "bg-purple-300 dark:bg-purple-800 border-purple-400" },
  { id: "fuchsia", name: "Fuchsia Pink", bgClass: "bg-fuchsia-50 dark:bg-[#271026]", borderClass: "border-fuchsia-200 dark:border-fuchsia-950", dotClass: "bg-fuchsia-300 dark:bg-fuchsia-800 border-fuchsia-400" },
];

export default function KeepNotes({ notes = [], onAddNote, onUpdateNote, onDeleteNote }: KeepNotesProps) {
  const [isExpanding, setIsExpanding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newColor, setNewColor] = useState("default");
  const [newIsPinned, setNewIsPinned] = useState(false);
  const [showColorPickerId, setShowColorPickerId] = useState<string | null>(null);

  // Edit Modal State
  const [editingNote, setEditingNote] = useState<KeepNote | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close creator if clicked outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        if (!newTitle && !newContent) {
          setIsExpanding(false);
        } else if (newContent || newTitle) {
          // Auto-save on click outside if has content
          handleSaveNewNote();
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [newTitle, newContent, newColor, newIsPinned]);

  const handleSaveNewNote = () => {
    if (!newTitle.trim() && !newContent.trim()) {
      setIsExpanding(false);
      return;
    }
    onAddNote({
      title: newTitle.trim(),
      content: newContent.trim(),
      color: newColor,
      isPinned: newIsPinned,
    });
    // Reset form
    setNewTitle("");
    setNewContent("");
    setNewColor("default");
    setNewIsPinned(false);
    setIsExpanding(false);
  };

  const getColorClasses = (colorId?: string) => {
    const opt = COLOR_OPTIONS.find((c) => c.id === colorId) || COLOR_OPTIONS[0];
    return `${opt.bgClass} ${opt.borderClass}`;
  };

  // Filter notes by search query
  const filteredNotes = notes.filter((n) => {
    const query = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(query) ||
      n.content.toLowerCase().includes(query)
    );
  });

  const pinnedNotes = filteredNotes.filter((n) => n.isPinned);
  const otherNotes = filteredNotes.filter((n) => !n.isPinned);

  return (
    <div className="space-y-6">
      {/* Top Search Bar & Action Info */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-start">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-muted-soft-app">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keep notes..."
            className="w-full pl-10 pr-5 py-2.5 text-xs bg-surface-app text-ink-app border border-hairline-app rounded-full focus:outline-none focus:ring-2 focus:ring-primary-app/10 focus:border-primary-app transition-all placeholder:text-muted-soft-app font-medium font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-muted-soft-app hover:text-ink-app"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Google Keep Creator Card */}
      <div className="flex justify-center py-2">
        <div
          ref={containerRef}
          className={`w-full max-w-xl rounded-[20px] border transition-all duration-200 overflow-hidden bg-surface-app ${
            isExpanding 
              ? `${getColorClasses(newColor)} ring-2 ring-primary-app/15` 
              : "border-hairline-app hover:border-primary-app/30"
          }`}
        >
          {isExpanding ? (
            <div className="p-4 space-y-3">
              {/* Expanded Mode: Title Box + Pin Toggle */}
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="Title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-transparent text-sm font-bold font-serif text-ink-app placeholder:text-muted-soft-app focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setNewIsPinned(!newIsPinned)}
                  className={`p-1.5 rounded-full transition-colors ${
                    newIsPinned
                      ? "text-primary-app bg-primary-soft-app/20"
                      : "text-muted-soft-app hover:text-ink-app hover:bg-card-app"
                  }`}
                  title={newIsPinned ? "Unpin note" : "Pin note"}
                >
                  <Pin className={`w-4 h-4 ${newIsPinned ? "fill-current" : ""}`} />
                </button>
              </div>

              {/* Content Box */}
              <textarea
                placeholder="Take a study note or copy formulas..."
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                rows={3}
                className="w-full bg-transparent text-xs text-muted-app placeholder:text-muted-soft-app focus:outline-none resize-none leading-relaxed"
                autoFocus
              />

              {/* Bottom bar of options */}
              <div className="flex items-center justify-between pt-2 border-t border-hairline-soft-app">
                {/* Color Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none max-w-[280px]">
                  {COLOR_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setNewColor(opt.id)}
                      className={`w-5 h-5 rounded-full shrink-0 border transition-transform flex items-center justify-center relative ${opt.dotClass} ${
                        newColor === opt.id 
                          ? "scale-110 border-primary-app ring-2 ring-primary-app/15" 
                          : "border-transparent hover:scale-105"
                      }`}
                      title={opt.name}
                    >
                      {newColor === opt.id && (
                        <Check className="w-2.5 h-2.5 text-ink-app" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setNewTitle("");
                      setNewContent("");
                      setNewColor("default");
                      setNewIsPinned(false);
                      setIsExpanding(false);
                    }}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold text-muted-soft-app hover:bg-card-app transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewNote}
                    className="px-4 py-1.5 bg-primary-app hover:bg-primary-app/90 text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Collapsed Mode */
            <div
              onClick={() => setIsExpanding(true)}
              className="p-3.5 flex items-center justify-between cursor-pointer select-none text-muted-soft-app text-xs font-medium"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-primary-app" />
                <span>Take a subject note or copy study formulas...</span>
              </div>
              <Plus className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      {/* Main Grid Lists */}
      <div className="space-y-8">
        {notes.length === 0 ? (
          <div className="text-center py-12 px-6 bg-surface-app rounded-3xl border border-dashed border-hairline-app space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary-soft-app/20 flex items-center justify-center mx-auto text-primary-app border border-primary-app/10">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold font-serif text-ink-app">No Keep Notes Yet</h3>
              <p className="text-xs text-muted-soft-app max-w-sm mx-auto leading-relaxed">
                Add formulas, study logs, key dates, or general syllabus remarks inside Google Keep-style notes above.
              </p>
            </div>
          </div>
        ) : (
          <>
            {/* Pinned Notes Section */}
            {pinnedNotes.length > 0 && (
              <div className="space-y-3.5">
                <h3 className="text-[10px] font-bold text-primary-app uppercase tracking-widest pl-1.5 flex items-center gap-1.5 font-mono">
                  <Pin className="w-3.5 h-3.5 fill-current" />
                  Pinned Notes ({pinnedNotes.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pinnedNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      getColorClasses={getColorClasses}
                      onUpdate={onUpdateNote}
                      onDelete={onDeleteNote}
                      onEditClick={setEditingNote}
                      showColorPickerId={showColorPickerId}
                      setShowColorPickerId={setShowColorPickerId}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Others Section */}
            {otherNotes.length > 0 && (
              <div className="space-y-3.5">
                {pinnedNotes.length > 0 && (
                  <h3 className="text-[10px] font-bold text-muted-soft-app uppercase tracking-widest pl-1.5 font-mono">
                    Other Notes ({otherNotes.length})
                  </h3>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherNotes.map((note) => (
                    <NoteCard
                      key={note.id}
                      note={note}
                      getColorClasses={getColorClasses}
                      onUpdate={onUpdateNote}
                      onDelete={onDeleteNote}
                      onEditClick={setEditingNote}
                      showColorPickerId={showColorPickerId}
                      setShowColorPickerId={setShowColorPickerId}
                    />
                  ))}
                </div>
              </div>
            )}
            
            {filteredNotes.length === 0 && searchQuery && (
              <div className="text-center py-10 text-muted-soft-app text-xs font-semibold">
                No notes found matching "{searchQuery}"
              </div>
            )}
          </>
        )}
      </div>

      {/* Keep Note Editor Dialog Modal */}
      <AnimatePresence>
        {editingNote && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                onUpdateNote(editingNote);
                setEditingNote(null);
              }}
              className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs"
            />

            {/* Modal Box */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={`relative w-full max-w-lg overflow-hidden rounded-3xl border shadow-xl z-10 flex flex-col ${getColorClasses(
                editingNote.color
              )}`}
            >
              <div className="p-6 space-y-4">
                {/* Header title input */}
                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    value={editingNote.title}
                    onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                    placeholder="Title"
                    className="w-full bg-transparent text-lg font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setEditingNote({ ...editingNote, isPinned: !editingNote.isPinned })}
                    className={`p-1.5 rounded-full transition-colors ${
                      editingNote.isPinned
                        ? "text-primary-app bg-primary-soft-app/30 dark:bg-primary-soft-app/15"
                        : "text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/40"
                    }`}
                  >
                    <Pin className={`w-4.5 h-4.5 ${editingNote.isPinned ? "fill-current" : ""}`} />
                  </button>
                </div>

                {/* Text content textarea */}
                <textarea
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  placeholder="Note content"
                  rows={6}
                  className="w-full bg-transparent text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none leading-relaxed"
                />

                {/* Bottom row actions */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-200/40 dark:border-slate-700/40">
                  {/* Colors */}
                  <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-[240px]">
                    {COLOR_OPTIONS.map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setEditingNote({ ...editingNote, color: opt.id })}
                        className={`w-5 h-5 rounded-full shrink-0 border transition-transform flex items-center justify-center ${opt.dotClass} ${
                          editingNote.color === opt.id 
                            ? "scale-110 border-primary-app ring-2 ring-primary-app/20" 
                            : "border-transparent hover:scale-105"
                        }`}
                        title={opt.name}
                      >
                        {editingNote.color === opt.id && (
                          <Check className="w-2.5 h-2.5 text-slate-850 dark:text-slate-100" />
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Save/Close button */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteNote(editingNote.id);
                        setEditingNote(null);
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-full transition-colors"
                      title="Delete Note"
                    >
                      <Trash2 className="w-4.5 h-4.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateNote(editingNote);
                        setEditingNote(null);
                      }}
                      className="px-5 py-2 bg-slate-900 hover:bg-black dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-full transition-colors shadow-sm"
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Individual Note Card component to manage localized interactions */
interface NoteCardProps {
  key?: string | number;
  note: KeepNote;
  getColorClasses: (colorId?: string) => string;
  onUpdate: (note: KeepNote) => void;
  onDelete: (id: string) => void;
  onEditClick: (note: KeepNote) => void;
  showColorPickerId: string | null;
  setShowColorPickerId: (id: string | null) => void;
}

function NoteCard({ 
  note, 
  getColorClasses, 
  onUpdate, 
  onDelete, 
  onEditClick,
  showColorPickerId,
  setShowColorPickerId
}: NoteCardProps) {
  const isColorPickerOpen = showColorPickerId === note.id;
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close color picker when clicked outside
  useEffect(() => {
    function clickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowColorPickerId(null);
      }
    }
    if (isColorPickerOpen) {
      document.addEventListener("mousedown", clickOutside);
    }
    return () => document.removeEventListener("mousedown", clickOutside);
  }, [isColorPickerOpen]);

  const handleTogglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate({
      ...note,
      isPinned: !note.isPinned,
    });
  };

  const handlePaletteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowColorPickerId(isColorPickerOpen ? null : note.id);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(note.id);
  };

  return (
    <div
      onClick={() => onEditClick(note)}
      className={`relative rounded-2xl border p-4.5 transition-all duration-200 group cursor-pointer flex flex-col justify-between min-h-[140px] shadow-none ${getColorClasses(
        note.color
      )}`}
    >
      {/* Top Header Row of the Card */}
      <div className="space-y-1.5">
        <div className="flex items-start justify-between gap-2.5">
          <h4 className="text-sm font-bold font-serif text-ink-app leading-snug tracking-tight">
            {note.title || <span className="text-muted-soft-app italic font-normal">Untitled Note</span>}
          </h4>
          <button
            type="button"
            onClick={handleTogglePin}
            className={`p-1.5 rounded-full transition-all shrink-0 ${
              note.isPinned
                ? "text-primary-app bg-primary-soft-app/20"
                : "text-muted-soft-app hover:text-ink-app opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-card-app"
            }`}
            title={note.isPinned ? "Unpin note" : "Pin note"}
          >
            <Pin className={`w-3.5 h-3.5 ${note.isPinned ? "fill-current" : ""}`} />
          </button>
        </div>

        {/* Note Body Content */}
        <p className="text-xs text-muted-app whitespace-pre-wrap leading-relaxed break-words font-medium overflow-hidden max-h-[160px] line-clamp-6">
          {note.content}
        </p>
      </div>

      {/* Note Action Toolbar (At bottom) */}
      <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-hairline-soft-app relative">
        <span className="text-[10px] text-muted-soft-app font-bold tracking-tight">
          {new Date(note.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}
        </span>

        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {/* Palette button */}
          <div ref={pickerRef} className="relative">
            <button
              type="button"
              onClick={handlePaletteClick}
              className="p-1.5 text-muted-soft-app hover:text-ink-app hover:bg-card-app rounded-full transition-all"
              title="Change color"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            {isColorPickerOpen && (
              <div className="absolute bottom-full right-0 mb-2 p-2 bg-surface-app rounded-xl border border-hairline-app z-20 flex gap-1.5 max-w-[200px] flex-wrap justify-center">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate({ ...note, color: opt.id });
                      setShowColorPickerId(null);
                    }}
                    className={`w-4 h-4 rounded-full shrink-0 border ${opt.dotClass} ${
                      note.color === opt.id ? "scale-110 ring-2 ring-primary-app/15" : "hover:scale-105"
                    }`}
                    title={opt.name}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Delete button */}
          <button
            type="button"
            onClick={handleDelete}
            className="p-1.5 text-muted-soft-app hover:text-rose-600 hover:bg-rose-50 rounded-full transition-all"
            title="Delete Note"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

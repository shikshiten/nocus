import React, { useState, useRef } from "react";
import { 
  Upload, 
  FileText, 
  Sparkles, 
  Loader2, 
  AlertCircle, 
  Trash2, 
  Plus, 
  GripVertical, 
  CheckCircle2, 
  X, 
  AlertTriangle, 
  ArrowLeft, 
  Pencil, 
  FileImage, 
  Info,
  Camera,
  AlignLeft,
  ChevronDown
} from "lucide-react";
import { SyllabusUploadState, ImageUpload, PreviewSyllabusData } from "../types";

interface SyllabusUploadProps {
  onSyllabusParsed: (data: { subjectName: string; units: Array<{ name: string; topics: string[] }> }) => void;
  uploadState: SyllabusUploadState;
  setUploadState: React.Dispatch<React.SetStateAction<SyllabusUploadState>>;
  onProcessFile: (file: File) => Promise<void>;
  onProcessText: (text: string) => Promise<void>;
  onScanImages: (images: ImageUpload[]) => Promise<void>;
}

export default function SyllabusUpload({ 
  onSyllabusParsed,
  uploadState,
  setUploadState,
  onProcessFile,
  onProcessText,
  onScanImages
}: SyllabusUploadProps) {
  const { loading, error, mode, syllabusText, images, previewSyllabus } = uploadState;

  const setLoading = (val: boolean) => setUploadState(prev => ({ ...prev, loading: val }));
  const setError = (val: string | null) => setUploadState(prev => ({ ...prev, error: val }));
  const setMode = (val: "file" | "text" | "image") => setUploadState(prev => ({ ...prev, mode: val }));
  const setSyllabusText = (val: string) => setUploadState(prev => ({ ...prev, syllabusText: val }));
  const setImages = (val: ImageUpload[] | ((prev: ImageUpload[]) => ImageUpload[])) => {
    setUploadState(prev => ({
      ...prev,
      images: typeof val === "function" ? val(prev.images) : val
    }));
  };
  const setPreviewSyllabus = (val: PreviewSyllabusData | null | ((prev: PreviewSyllabusData | null) => PreviewSyllabusData | null)) => {
    setUploadState(prev => ({
      ...prev,
      previewSyllabus: typeof val === "function" ? val(prev.previewSyllabus) : val
    }));
  };

  const [dragActive, setDragActive] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Drag-and-drop state for reordering topics
  const [draggedItem, setDraggedItem] = useState<{ unitIdx: number; topicIdx: number } | null>(null);
  const [draggedOverItem, setDraggedOverItem] = useState<{ unitIdx: number; topicIdx: number } | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    if (!file) return;
    await onProcessFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (mode === "file") {
        processFile(e.dataTransfer.files[0]);
      } else if (mode === "image") {
        handleMultipleImages(e.dataTransfer.files);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleMultipleImages = (fileList: FileList) => {
    Array.from(fileList).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setError("Please upload image files only (PNG, JPG, JPEG).");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setImages((prev) => [
          ...prev,
          {
            id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            base64,
            mimeType: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleMultipleImages(e.target.files);
    }
  };

  const removeImage = (id: string) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syllabusText.trim()) {
      setError("Please paste your syllabus text first.");
      return;
    }
    await onProcessText(syllabusText);
  };

  const handleImageSubmit = async () => {
    if (images.length === 0) {
      setError("Please select or drop at least one syllabus image first.");
      return;
    }
    await onScanImages(images);
  };

  // Preview Actions
  const handleAddUnit = () => {
    if (!previewSyllabus) return;
    setPreviewSyllabus({
      ...previewSyllabus,
      units: [
        ...previewSyllabus.units,
        {
          name: `Unit ${previewSyllabus.units.length + 1}: New Unit`,
          topics: [],
        },
      ],
    });
  };

  const handleDeleteUnit = (unitIdx: number) => {
    if (!previewSyllabus) return;
    const updatedUnits = [...previewSyllabus.units];
    updatedUnits.splice(unitIdx, 1);
    setPreviewSyllabus({
      ...previewSyllabus,
      units: updatedUnits,
    });
  };

  const handleAddTopic = (unitIdx: number) => {
    if (!previewSyllabus) return;
    const updatedUnits = [...previewSyllabus.units];
    updatedUnits[unitIdx].topics.push({
      name: "New Topic Name",
      isLowConfidence: false,
    });
    setPreviewSyllabus({
      ...previewSyllabus,
      units: updatedUnits,
    });
  };

  const handleDeleteTopic = (unitIdx: number, topicIdx: number) => {
    if (!previewSyllabus) return;
    const updatedUnits = [...previewSyllabus.units];
    updatedUnits[unitIdx].topics.splice(topicIdx, 1);
    setPreviewSyllabus({
      ...previewSyllabus,
      units: updatedUnits,
    });
  };

  const handleSaveAndImport = () => {
    if (!previewSyllabus) return;

    // Convert back to original target format
    const finalData = {
      subjectName: previewSyllabus.subjectName || "Unnamed Syllabus",
      units: previewSyllabus.units.map((u) => ({
        name: u.name || "Unnamed Unit",
        topics: u.topics.map((t) => t.name).filter(Boolean),
      })),
    };

    onSyllabusParsed(finalData);
    setPreviewSyllabus(null);
  };

  // Drag-and-drop mechanics for topic reordering
  const handleDragStart = (e: React.DragEvent, unitIdx: number, topicIdx: number) => {
    setDraggedItem({ unitIdx, topicIdx });
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", ""); // Firefox requirement
  };

  const handleDragOver = (e: React.DragEvent, unitIdx: number, topicIdx: number) => {
    e.preventDefault();
    setDraggedOverItem({ unitIdx, topicIdx });
  };

  const handleDropTopic = (e: React.DragEvent, targetUnitIdx: number, targetTopicIdx: number) => {
    e.preventDefault();
    if (!draggedItem || !previewSyllabus) return;

    const sourceUnitIdx = draggedItem.unitIdx;
    const sourceTopicIdx = draggedItem.topicIdx;

    const updatedUnits = [...previewSyllabus.units];
    
    // Extract item
    const [movedTopic] = updatedUnits[sourceUnitIdx].topics.splice(sourceTopicIdx, 1);
    
    // Insert into target
    updatedUnits[targetUnitIdx].topics.splice(targetTopicIdx, 0, movedTopic);

    setPreviewSyllabus({
      ...previewSyllabus,
      units: updatedUnits,
    });

    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedOverItem(null);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const triggerImageInput = () => {
    imageInputRef.current?.click();
  };

  // Render Preview Screen
  if (previewSyllabus) {
    const totalUnits = previewSyllabus.units.length;
    const totalTopics = previewSyllabus.units.reduce((acc, u) => acc + u.topics.length, 0);
    const lowConfidenceCount = previewSyllabus.units.reduce(
      (acc, u) => acc + u.topics.filter((t) => t.isLowConfidence).length,
      0
    );

    return (
      <div className="bg-surface-app p-6 rounded-3xl border border-hairline-app transition-all duration-300 space-y-6">
        {/* Preview Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-hairline-soft-app">
          <div>
            <div className="flex items-center gap-2 text-primary-app font-bold text-xs uppercase tracking-widest">
              <Sparkles className="w-4 h-4" />
              AI Parser Preview
            </div>
            <h2 className="text-xl font-bold font-serif text-ink-app mt-1">
              Verify & Polish Syllabus
            </h2>
            <p className="text-xs text-muted-soft-app mt-1">
              Refine names, reorder topics, resolve uncertainties, or add missing sections before saving.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <button
              onClick={() => setPreviewSyllabus(null)}
              className="px-4 py-2 text-xs font-semibold text-muted-app hover:text-ink-app hover:bg-card-app rounded-full transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </button>
            <button
              onClick={handleSaveAndImport}
              className="px-5 py-2 bg-primary-app hover:bg-opacity-90 text-white font-bold text-xs rounded-full transition-all shadow-none flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Build Active Tracker
            </button>
          </div>
        </div>

        {/* Info stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/35 border border-slate-150 dark:border-slate-800/80 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Units</div>
            <div className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{totalUnits}</div>
          </div>
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/35 border border-slate-150 dark:border-slate-800/80 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Topics</div>
            <div className="text-lg font-black text-slate-800 dark:text-white mt-0.5">{totalTopics}</div>
          </div>
          {lowConfidenceCount > 0 && (
            <div className="col-span-2 md:col-span-1 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/20 rounded-2xl flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-500 dark:text-amber-400 shrink-0" />
              <div>
                <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                  Review Required
                </div>
                <div className="text-xs font-black text-amber-700 dark:text-amber-300 mt-0.5">
                  {lowConfidenceCount} Uncertain parts flagged
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Editable Subject Title */}
        <div className="space-y-1.5 p-4 bg-slate-50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-800/80 rounded-2xl">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Pencil className="w-3 h-3" /> Subject Title
          </label>
          <input
            type="text"
            value={previewSyllabus.subjectName}
            onChange={(e) => setPreviewSyllabus({ ...previewSyllabus, subjectName: e.target.value })}
            placeholder="e.g. Inorganic Chemistry, Data Structures"
            className="w-full text-lg font-black bg-transparent border-b border-dashed border-slate-300 dark:border-slate-700 focus:border-primary-app focus:outline-none text-slate-800 dark:text-white pb-1.5 transition-colors"
          />
        </div>

        {/* Low Confidence Warning Header */}
        {lowConfidenceCount > 0 && (
          <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Some topics are highlighted in <span className="font-bold underline">amber</span>. These represents smudged, handwritten, or complex characters that our scanner parsed with low confidence. Please verify their spelling before importing.
            </p>
          </div>
        )}

        {/* Units & Topics List */}
        <div className="space-y-5">
          {previewSyllabus.units.map((unit, unitIdx) => (
            <div 
              key={unitIdx}
              className="border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 bg-slate-50/20 dark:bg-slate-900/10 space-y-4"
            >
              {/* Unit Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-primary-app">Unit {unitIdx + 1}</span>
                  <input
                    type="text"
                    value={unit.name}
                    onChange={(e) => {
                      const updatedUnits = [...previewSyllabus.units];
                      updatedUnits[unitIdx].name = e.target.value;
                      setPreviewSyllabus({ ...previewSyllabus, units: updatedUnits });
                    }}
                    placeholder="Unit Name"
                    className="font-bold text-sm text-slate-800 dark:text-white bg-transparent border-b border-transparent hover:border-slate-300 dark:hover:border-slate-700 focus:border-primary-app focus:outline-none w-full py-0.5"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleAddTopic(unitIdx)}
                    className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-primary-app rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold"
                    title="Add Topic"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Topic
                  </button>
                  <button
                    onClick={() => handleDeleteUnit(unitIdx)}
                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-rose-500 rounded-lg transition-colors"
                    title="Delete Unit"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Topics list */}
              <div className="space-y-2">
                {unit.topics.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-3 italic">
                    No topics in this unit. Click "Add Topic" to add one.
                  </p>
                ) : (
                  unit.topics.map((topic, topicIdx) => {
                    const isOver = draggedOverItem?.unitIdx === unitIdx && draggedOverItem?.topicIdx === topicIdx;
                    const isDragged = draggedItem?.unitIdx === unitIdx && draggedItem?.topicIdx === topicIdx;

                    return (
                      <div
                        key={topicIdx}
                        draggable
                        onDragStart={(e) => handleDragStart(e, unitIdx, topicIdx)}
                        onDragOver={(e) => handleDragOver(e, unitIdx, topicIdx)}
                        onDragEnd={handleDragEnd}
                        onDrop={(e) => handleDropTopic(e, unitIdx, topicIdx)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border transition-all ${
                          isDragged ? "opacity-30 border-dashed border-primary-app bg-primary-soft-app/10" : ""
                        } ${
                          isOver ? "border-primary-app bg-primary-soft-app/10 scale-[1.01]" : ""
                        } ${
                          topic.isLowConfidence 
                            ? "bg-amber-500/5 dark:bg-amber-500/[0.03] border-amber-300/40 dark:border-amber-900/30 shadow-xs" 
                            : "bg-white dark:bg-slate-800 border-slate-150 dark:border-slate-700/60"
                        }`}
                      >
                        {/* Drag Handle */}
                        <div className="cursor-grab text-slate-350 dark:text-slate-650 hover:text-primary-app p-0.5">
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {/* Input Area */}
                        <div className="flex-1 space-y-1">
                          <input
                            type="text"
                            value={topic.name}
                            onChange={(e) => {
                              const updatedUnits = [...previewSyllabus.units];
                              updatedUnits[unitIdx].topics[topicIdx].name = e.target.value;
                              setPreviewSyllabus({ ...previewSyllabus, units: updatedUnits });
                            }}
                            className="text-xs font-medium text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none w-full border-b border-transparent focus:border-slate-300 dark:focus:border-slate-700 py-0.5"
                          />

                          {/* Confidence Warning */}
                          {topic.isLowConfidence && (
                            <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span>Uncertain: {topic.confidenceReason || "blurry or complex text"}</span>
                            </div>
                          )}
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={() => handleDeleteTopic(unitIdx, topicIdx)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/25 text-slate-400 hover:text-rose-500 rounded-lg transition-colors"
                          title="Delete topic"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}

                {/* Drop indicator at end of list */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (!draggedItem) return;
                    const sourceUnitIdx = draggedItem.unitIdx;
                    const sourceTopicIdx = draggedItem.topicIdx;
                    const updatedUnits = [...previewSyllabus.units];
                    const [movedTopic] = updatedUnits[sourceUnitIdx].topics.splice(sourceTopicIdx, 1);
                    updatedUnits[unitIdx].topics.push(movedTopic);
                    setPreviewSyllabus({ ...previewSyllabus, units: updatedUnits });
                    setDraggedItem(null);
                    setDraggedOverItem(null);
                  }}
                  className="h-10 border border-dashed border-hairline-soft-app rounded-xl flex items-center justify-center text-[10px] text-muted-soft-app hover:bg-card-app/40 hover:text-primary-app transition-colors mt-2"
                >
                  Drop topics here to move to the end of Unit {unitIdx + 1}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add Unit card button */}
        <button
          onClick={handleAddUnit}
          className="w-full py-3.5 border border-dashed border-hairline-app rounded-2xl text-xs font-bold text-primary-app hover:bg-primary-soft-app/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add New Syllabus Unit
        </button>

        {/* Floating actions footer */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-hairline-soft-app">
          <button
            onClick={() => setPreviewSyllabus(null)}
            className="px-5 py-2.5 text-xs font-semibold text-muted-app hover:bg-card-app rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndImport}
            className="px-6 py-2.5 bg-primary-app hover:bg-opacity-95 text-white font-black text-xs uppercase tracking-wider rounded-full flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            Save & Import Syllabus
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto bg-[var(--surface)] border border-[var(--border)] rounded-3xl p-6 md:p-8 shadow-2xl transition-all duration-300">
      {/* Header inside Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[var(--border)]">
        <div>
          <h3 className="text-lg font-bold text-[var(--text)] tracking-tight flex items-center gap-2 font-serif">
            <svg width="20" height="20" className="w-5 h-5 text-[var(--accent)] animate-pulse shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
            Import Your Curriculum
          </h3>
          <p className="text-xs text-[var(--text-muted)] mt-1 font-sans">
            Select your preferred method to parse and structure your syllabus instantly.
          </p>
        </div>
      </div>

      {/* Redesigned Import Method Selector Header Block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 bg-[var(--bg)] border border-[var(--border)] p-4 rounded-2xl relative">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[var(--accent-soft)] text-[var(--accent)] rounded-xl shrink-0">
            {mode === "file" && <FileText className="w-5 h-5" />}
            {mode === "text" && <AlignLeft className="w-5 h-5" />}
            {mode === "image" && <Camera className="w-5 h-5" />}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)] leading-none font-mono">
              Import Method
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm font-extrabold text-[var(--text)] truncate">
                {mode === "file" && "Upload PDF"}
                {mode === "text" && "Paste Text"}
                {mode === "image" && "Scan Documents"}
              </span>
            </div>
          </div>
        </div>

        {/* Compact Dropdown Selector Button & Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full sm:w-auto px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)] text-[var(--text)] text-xs font-bold rounded-xl flex items-center justify-between sm:justify-start gap-2 shadow-xs transition-all duration-200 cursor-pointer select-none"
          >
            <span>Change Method</span>
            <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {isDropdownOpen && (
            <>
              {/* Invisible Backdrop overlay to intercept clicks outside and dismiss */}
              <div 
                className="fixed inset-0 z-30" 
                onClick={() => setIsDropdownOpen(false)}
              />
              
              {/* Floating Popover Menu Container */}
              <div className="absolute right-0 mt-2 w-72 bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl py-2 z-40 animate-in fade-in-50 slide-in-from-top-3 duration-200">
                <div className="px-4 py-1.5 border-b border-[var(--border)] mb-1">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider font-mono">
                    Select Import Method
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setMode("file");
                    setError(null);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-2.5 text-left transition-colors cursor-pointer ${
                    mode === "file"
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold"
                      : "text-[var(--text)] hover:bg-[var(--accent-soft)]/50"
                  }`}
                >
                  <FileText className={`w-4 h-4 mr-3 shrink-0 ${mode === "file" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">Upload PDF</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-sans truncate">Import from syllabus file</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("text");
                    setError(null);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-2.5 text-left transition-colors cursor-pointer ${
                    mode === "text"
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold"
                      : "text-[var(--text)] hover:bg-[var(--accent-soft)]/50"
                  }`}
                >
                  <AlignLeft className={`w-4 h-4 mr-3 shrink-0 ${mode === "text" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">Paste Text</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-sans truncate">Copy & paste syllabus text</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setMode("image");
                    setError(null);
                    setIsDropdownOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-2.5 text-left transition-colors cursor-pointer ${
                    mode === "image"
                      ? "bg-[var(--accent-soft)] text-[var(--accent)] font-semibold"
                      : "text-[var(--text)] hover:bg-[var(--accent-soft)]/50"
                  }`}
                >
                  <Camera className={`w-4 h-4 mr-3 shrink-0 ${mode === "image" ? "text-[var(--accent)]" : "text-[var(--text-muted)]"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">Scan Documents</div>
                    <div className="text-[10px] text-[var(--text-muted)] font-sans truncate">Extract from pages or scans</div>
                  </div>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-rose-500/10 text-rose-500 text-xs rounded-xl border border-rose-500/20 flex items-start gap-3">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Error:</span> {error}
          </div>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 px-4 border border-dashed border-[var(--border)] rounded-2xl bg-[var(--bg)]">
          <Loader2 className="w-10 h-10 text-[var(--accent)] animate-spin" />
          <h3 className="mt-4 text-sm font-bold text-[var(--text)] font-serif">
            Scanning & Building Curriculum...
          </h3>
          <p className="mt-2 text-xs text-[var(--text-muted)] text-center max-w-sm font-sans leading-relaxed">
            Leveraging multimodal Gemini AI to extract subjects, organize chapters sequentially, and flagging handwritten or blurry contents with OCR confidence assessment.
          </p>
        </div>
      ) : mode === "file" ? (
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={triggerFileInput}
          className={`group relative border-[1.5px] border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer select-none ${
            dragActive
              ? "border-[var(--accent)] bg-[var(--accent-hover)] shadow-[0_0_24px_var(--accent-glow)]"
              : "border-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[var(--accent-hover)] hover:shadow-[0_0_24px_var(--accent-glow)]"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="application/pdf"
            onChange={handleFileChange}
          />
          <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
            {/* Upload Icon Circle */}
            <div className="p-4 bg-[#101010] rounded-full border border-[var(--border)] text-[var(--accent)] group-hover:scale-105 group-hover:border-[var(--accent)] transition-all duration-200 shadow-md">
              <svg width="24" height="24" className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--text)] transition-colors">
                Click to upload or drag & drop syllabus PDF
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1.5 font-sans">
                Supports comprehensive syllabus or curriculum layouts in standard PDF format
              </p>
            </div>
          </div>
        </div>
      ) : mode === "text" ? (
        <form onSubmit={handleTextSubmit} className="space-y-4">
          <div>
            <textarea
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              placeholder="Paste your subject curriculum or syllabus here. For example:&#10;Unit 1: Introduction to Web Development&#10;- HTML Basics&#10;- CSS Fundamentals&#10;- Responsive Layouts&#10;&#10;Unit 2: JavaScript Core..."
              className="w-full h-44 p-4 text-xs bg-[var(--bg)] text-[var(--text)] border border-[var(--border)] rounded-xl focus:outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent-glow)] transition-all resize-none font-mono placeholder:text-[var(--text-muted)]"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-[var(--accent)] text-white hover:brightness-110 font-semibold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer font-sans rounded-full shadow-md shadow-[var(--accent-glow)] transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              Build Tracker Using Gemini AI
            </button>
          </div>
        </form>
      ) : (
        /* Image Scanner Mode */
        <div className="space-y-5">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={triggerImageInput}
            className={`group relative border-[1.5px] border-dashed rounded-2xl p-12 text-center transition-all duration-200 cursor-pointer select-none ${
              dragActive
                ? "border-[var(--accent)] bg-[var(--accent-hover)] shadow-[0_0_24px_var(--accent-glow)]"
                : "border-[var(--accent)] bg-[var(--accent-soft)] hover:bg-[var(--accent-hover)] hover:shadow-[0_0_24px_var(--accent-glow)]"
            }`}
          >
            <input
              ref={imageInputRef}
              type="file"
              multiple
              className="hidden"
              accept="image/*"
              onChange={handleImageInputChange}
            />
            <div className="flex flex-col items-center justify-center space-y-4 pointer-events-none">
              <div className="p-4 bg-[#101010] rounded-full border border-[var(--border)] text-[var(--accent)] group-hover:scale-105 group-hover:border-[var(--accent)] transition-all duration-200 shadow-md">
                <FileImage className="w-6 h-6 animate-pulse shrink-0" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)] transition-colors">
                  Click to upload or drag & drop syllabus images
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1.5 font-sans">
                  Supports multiple photos of printed or handwritten pages (English, Hindi, mixed Hinglish)
                </p>
              </div>
            </div>
          </div>

          {/* Uploaded Thumbnails list */}
          {images.length > 0 && (
            <div className="space-y-4 bg-[var(--bg)] p-5 border border-[var(--border)] rounded-2xl">
              <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)] font-bold tracking-wider px-1 font-mono">
                <span>UPLOADED SYLLABUS PAGES ({images.length})</span>
                <button
                  onClick={() => setImages([])}
                  className="text-rose-500 hover:text-rose-400 flex items-center gap-1 font-bold cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="relative group bg-[var(--surface)] border border-[var(--border)] rounded-[14px] overflow-hidden aspect-square flex flex-col justify-between shadow-xs transition-transform duration-200 hover:scale-[1.02]"
                  >
                    <img
                      src={img.base64}
                      alt={img.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(img.id);
                        }}
                        className="p-2 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors shadow"
                        title="Remove page"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-[var(--surface)]/95 p-1.5 text-[9px] text-[var(--text-muted)] truncate font-semibold text-center border-t border-[var(--border)]">
                      {img.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Process trigger */}
          <div className="flex justify-end pt-2">
            <button
              onClick={handleImageSubmit}
              disabled={images.length === 0}
              className={`px-6 py-3 bg-[var(--accent)] text-white hover:brightness-110 font-semibold text-xs tracking-wide flex items-center gap-1.5 cursor-pointer font-sans rounded-full shadow-md shadow-[var(--accent-glow)] transition-all active:scale-95 ${
                images.length === 0 ? "opacity-35 cursor-not-allowed shadow-none" : "hover:scale-[1.02]"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              Scan & Process Syllabus with Gemini AI
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

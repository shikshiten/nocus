"use client"

import GlassFolder from "./glass-folder-cards"

/**
 * Three folders on a dotted desk: milk glass over a long-exposure print with a
 * key that adds files, a plain archive with a menu, and smoked glass over red
 * ink. Hover one to lean its glass toward you, click it to open it.
 */
export default function GlassFolderCardsDemo() {
  return (
    <div
      className="relative flex w-full flex-col items-center justify-center overflow-hidden bg-[#070913] px-4 sm:px-6 py-12 rounded-3xl border border-white/10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 text-white opacity-[0.06]"
        style={{
          backgroundImage: "radial-gradient(currentColor 1.1px, transparent 1.4px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div className="relative grid max-w-[1180px] w-full grid-cols-1 items-end justify-items-center gap-x-10 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
        <GlassFolder
          label="Computer Networks"
          art="aurora"
          seed={3}
          appearDelay={0}
          files={[
            { name: "Unit 2: Transport Protocols.pdf", meta: "PDF · 2.4 MB" },
            { name: "Subnetting Cheat Sheet", meta: "PNG · 1.8 MB", art: "ember" },
            { name: "Midterm Revision Notes.pdf", meta: "PDF · 940 KB" },
          ]}
        />
        <GlassFolder
          label="Course Vault"
          art="none"
          action="more"
          labelPlacement="top-left"
          appearDelay={140}
          files={[
            { name: "Calculus Formula Book", meta: "PDF · 3.1 MB", art: "dusk" },
            { name: "Assignment 4 Solutions", meta: "PDF · 820 KB" },
            { name: "Lab Manual & Code", meta: "ZIP · 4.2 MB", art: "ember" },
            { name: "Course Syllabus 2026.pdf", meta: "PDF · 410 KB" },
          ]}
          menu={[{ label: "Rename Folder" }, { label: "Export All PDFs" }, { label: "Move to Trash", danger: true }]}
        />
        <GlassFolder
          label="Study Archives"
          meta="Updated Today"
          tone="dark"
          art="ember"
          seed={11}
          action="add"
          labelPlacement="top-right"
          appearDelay={280}
          files={[
            { name: "Previous Year Questions", meta: "28 items", art: "verdant" },
            { name: "Viva Preparation Guide", meta: "PDF · 1.2 MB" },
            { name: "Mind Maps & Diagrams", meta: "IMG · 8.4 MB", art: "glacier" },
          ]}
        />
      </div>
      <p className="relative mt-8 font-mono text-[10px] sm:text-[11px] tracking-[0.18em] text-slate-400 uppercase text-center select-none">
        Hover to lean · Tap or click to open · + to add notes
      </p>
    </div>
  )
}

import TiltedGridHero, { TiltedGridImage } from "./tilted-grid-hero";

export const SCHOLAR_IMAGES: TiltedGridImage[] = [
  {
    src: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=800&q=80",
    alt: "Focused student studying textbooks and notes",
  },
  {
    src: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
    alt: "Digital study workspace with structured syllabus",
  },
  {
    src: "https://images.unsplash.com/photo-1509228468518-180dd4864904?auto=format&fit=crop&w=800&q=80",
    alt: "Mathematics geometry and architectural blueprints",
  },
  {
    src: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80",
    alt: "Computer science programming and algorithms",
  },
  {
    src: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=800&q=80",
    alt: "Exam preparation and revision checklist",
  },
  {
    src: "https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=800&q=80",
    alt: "Laboratory science experiments and research",
  },
  {
    src: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=800&q=80",
    alt: "Stacked educational books in library",
  },
  {
    src: "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=800&q=80",
    alt: "Modern study library and scholar desks",
  },
];

export default function TiltedGridHeroDemo() {
  return (
    <TiltedGridHero
      images={SCHOLAR_IMAGES}
      className="h-[460px] sm:h-[540px] w-full rounded-3xl border border-white/10 bg-[#070913]"
    >
      <div className="relative z-10 flex h-full flex-col items-center justify-between py-10 sm:py-14 text-center pointer-events-none select-none">
        <div className="px-6 space-y-2">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono">
            IMMERSIVE SCHOLAR ECOSYSTEM
          </span>
          <h2 className="text-balance text-3xl sm:text-5xl font-black tracking-tight text-white">
            Every topic,
            <br />
            brought into sharp focus.
          </h2>
        </div>
        <p className="max-w-md text-balance px-6 text-xs sm:text-sm text-slate-400 font-medium leading-relaxed">
          Course materials stream along a cylinder curve, keeping your study momentum flowing effortlessly.
        </p>
      </div>
    </TiltedGridHero>
  );
}

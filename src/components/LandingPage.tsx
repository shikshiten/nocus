import React, { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Flame,
  Timer,
  FileText,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  Layers,
  Zap,
  Target,
  BarChart3,
  Calendar,
  FolderArchive,
  ChevronDown
} from "lucide-react";

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin?: () => void;
  user?: any;
}

export default function LandingPage({ onGetStarted, onLogin, user }: LandingPageProps) {
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const features = [
    {
      icon: Sparkles,
      color: "from-amber-500 to-orange-500",
      title: "AI Syllabus Extraction",
      desc: "Drop your syllabus PDF and let intelligent AI extract chapters, units, and learning goals into clear, actionable checklists automatically."
    },
    {
      icon: Timer,
      color: "from-violet-500 to-purple-500",
      title: "Deep Work Focus Timers",
      desc: "Built-in customizable Pomodoro timers eliminate digital distractions and keep your brain in the optimal flow state during revision sessions."
    },
    {
      icon: Flame,
      color: "from-rose-500 to-pink-500",
      title: "Daily Streak Habit Engine",
      desc: "Track daily study consistency with dynamic streak visualizers and weekly momentum dots that make studying every day rewarding."
    },
    {
      icon: FolderArchive,
      color: "from-indigo-500 to-blue-500",
      title: "Integrated Study Vault",
      desc: "Organize up to 7 essential course PDFs and lecture slides directly in your browser with lightning-fast in-app document preview."
    },
    {
      icon: Target,
      color: "from-emerald-500 to-teal-500",
      title: "Exam Timeline & Deadlines",
      desc: "Set exam targets and let Nocus automatically calculate overdue and pending topics so you always know what to study next."
    },
    {
      icon: ShieldCheck,
      color: "from-cyan-500 to-blue-500",
      title: "Offline-First & Private",
      desc: "Full guest mode allows you to study without an account. When signed in, all your checklists and notes sync seamlessly across your devices."
    }
  ];

  const faqs = [
    {
      q: "What is Nocus and how does it help students?",
      a: "Nocus is an all-in-one distraction-free study workspace designed specifically for college and school students. Instead of juggling multiple apps for notes, checklists, timers, and syllabus documents, Nocus unifies everything into one seamless, fast dashboard."
    },
    {
      q: "Can I use Nocus completely free?",
      a: "Yes! Nocus is 100% free to use. You can jump right in with Guest Mode without signing up, or create a free Scholar account to sync your study progress across your laptop and phone."
    },
    {
      q: "How does the AI syllabus parser work?",
      a: "Upload any syllabus PDF or copy-paste course text. Our AI analyzes the document structure, separates courses into modules or chapters, and outputs structured checklists with difficulty badges and progress markers."
    },
    {
      q: "What are the storage limits for the Document Vault?",
      a: "To keep the platform fast, responsive, and organized, each student can store up to 7 documents (5MB max each). Deleted files move to Trash and are safely purged after 7 days."
    },
    {
      q: "Does Nocus work offline?",
      a: "Yes! Nocus saves your syllabus progress, bookmarks, and keep notes in local browser storage so you can study without uninterrupted internet access."
    }
  ];

  return (
    <div className="min-h-screen bg-bg-app text-body-app font-sans antialiased selection:bg-primary-app/20 selection:text-primary-app">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-bg-app/80 backdrop-blur-md border-b border-hairline-soft-app px-4 sm:px-8 py-3.5 transition-colors">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div 
            onClick={onGetStarted}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center p-0.5 shadow-md shadow-primary-app/20 group-hover:scale-105 transition-transform">
              <img src="/nocus-logo.png" alt="nocus logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col justify-center leading-none">
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-primary-app font-mono mb-0.5">
                beta
              </span>
              <span className="font-sans text-lg font-black tracking-tight text-ink-app">
                nocus
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-muted-app">
            <a href="#features" className="hover:text-ink-app transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-ink-app transition-colors">How It Works</a>
            <a href="#preview" className="hover:text-ink-app transition-colors">Dashboard Preview</a>
            <a href="#faq" className="hover:text-ink-app transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {!user && onLogin && (
              <button
                onClick={onLogin}
                className="hidden sm:inline-flex text-xs font-bold text-muted-app hover:text-ink-app transition-colors px-3 py-1.5 cursor-pointer"
              >
                Sign In
              </button>
            )}
            <button
              onClick={onGetStarted}
              className="px-4 py-2 bg-primary-app hover:bg-primary-hover-app text-white text-xs font-bold rounded-xl shadow-md shadow-primary-app/20 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>{user ? "Open Workspace" : "Launch App"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 px-4 sm:px-6 overflow-hidden">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[300px] bg-primary-app/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-soft-app/30 border border-primary-app/20 text-primary-app text-xs font-bold tracking-wide animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Smart Syllabus Tracker & Deep-Work Workspace</span>
          </div>

          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-ink-app tracking-tight leading-[1.15] font-sans">
            Master your syllabus.
            <br />
            <span className="bg-gradient-to-r from-indigo-500 via-primary-app to-violet-500 bg-clip-text text-transparent">
              Stay consistent. Ace your exams.
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-base text-muted-app leading-relaxed font-medium">
            Nocus turns chaotic curriculum PDFs into structured chapter checklists, keeps you disciplined with daily streaks and Pomodoro focus timers, and organizes all your study docs in one sleek space.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <button
              onClick={onGetStarted}
              className="w-full sm:w-auto px-7 py-3.5 bg-primary-app hover:bg-primary-hover-app text-white text-sm font-bold rounded-2xl shadow-xl shadow-primary-app/25 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Get Started Free</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <a
              href="#features"
              className="w-full sm:w-auto px-6 py-3.5 bg-card-app hover:bg-card-strong-app border border-hairline-soft-app text-ink-app text-sm font-bold rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Explore Features</span>
            </a>
          </div>

          {/* Quick Stats Badges */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto text-left">
            <div className="p-3 bg-card-app/60 border border-hairline-soft-app rounded-2xl">
              <div className="text-lg font-black text-ink-app">Instant</div>
              <div className="text-[10px] font-bold text-muted-soft-app uppercase tracking-wider">AI PDF Parsing</div>
            </div>
            <div className="p-3 bg-card-app/60 border border-hairline-soft-app rounded-2xl">
              <div className="text-lg font-black text-rose-500">🔥 Daily</div>
              <div className="text-[10px] font-bold text-muted-soft-app uppercase tracking-wider">Streak Momentum</div>
            </div>
            <div className="p-3 bg-card-app/60 border border-hairline-soft-app rounded-2xl">
              <div className="text-lg font-black text-violet-500">25:00</div>
              <div className="text-[10px] font-bold text-muted-soft-app uppercase tracking-wider">Focus Timer</div>
            </div>
            <div className="p-3 bg-card-app/60 border border-hairline-soft-app rounded-2xl">
              <div className="text-lg font-black text-emerald-500">100%</div>
              <div className="text-[10px] font-bold text-muted-soft-app uppercase tracking-wider">Offline Ready</div>
            </div>
          </div>
        </div>

        {/* Interactive App Mockup Preview */}
        <div id="preview" className="max-w-5xl mx-auto mt-14 relative z-10">
          <div className="p-3 sm:p-5 bg-card-strong-app/40 rounded-3xl border border-hairline-soft-app shadow-2xl backdrop-blur-xs">
            <div className="bg-bg-app rounded-2xl border border-hairline-soft-app overflow-hidden shadow-inner p-4 sm:p-6 space-y-6">
              
              {/* Mockup Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-hairline-soft-app gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-soft-app/40 flex items-center justify-center text-primary-app font-bold text-sm">
                    CS
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink-app">Computer Networks & Architecture</h3>
                    <p className="text-[10px] text-muted-soft-app font-mono">Exam in 18 days • 68% Completed</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-xs font-bold rounded-full">
                    <span>🔥</span>
                    <span>14 Days Streak</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-500 text-xs font-bold rounded-full font-mono">
                    <Timer className="w-3.5 h-3.5" />
                    <span>25:00 Focus</span>
                  </div>
                </div>
              </div>

              {/* Mockup Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-muted-app">Syllabus Progress</span>
                  <span className="text-primary-app">17 of 25 Topics Mastered (68%)</span>
                </div>
                <div className="w-full h-2 bg-card-strong-app rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-app to-violet-500 rounded-full w-[68%]" />
                </div>
              </div>

              {/* Mockup Checklist Items */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {[
                  { title: "TCP vs UDP Protocol Header Analysis", unit: "Unit 2: Transport Layer", done: true },
                  { title: "Subnetting and CIDR Routing Tables", unit: "Unit 3: Network Layer", done: true },
                  { title: "DNS Resolution and Domain Hierarchy", unit: "Unit 1: Application Layer", done: true },
                  { title: "BGP & OSPF Distance Vector Routing", unit: "Unit 3: Routing Protocols", done: false, due: "Due Tomorrow" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                      item.done
                        ? "bg-emerald-500/5 border-emerald-500/20 text-muted-app"
                        : "bg-card-app border-hairline-soft-app text-ink-app"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                        item.done ? "bg-emerald-500 text-white" : "border border-hairline-app bg-card-app"
                      }`}>
                        {item.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <div className={`text-xs font-semibold ${item.done ? "line-through text-muted-soft-app" : "text-ink-app"}`}>
                          {item.title}
                        </div>
                        <div className="text-[10px] text-muted-soft-app">{item.unit}</div>
                      </div>
                    </div>
                    {item.due && (
                      <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                        {item.due}
                      </span>
                    )}
                  </div>
                ))}
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-card-app/40 border-y border-hairline-soft-app">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary-app font-mono">
              ENGINEERED FOR SCHOLARS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-ink-app tracking-tight font-sans">
              Everything you need to excel in your studies
            </h2>
            <p className="text-xs sm:text-sm text-muted-app leading-relaxed font-medium">
              Built from the ground up to replace fragmented study tools with one focused, beautifully fast system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={idx}
                  className="p-6 bg-card-app border border-hairline-soft-app rounded-2xl hover:border-primary-app/30 hover:shadow-lg transition-all space-y-3 group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-ink-app">{f.title}</h3>
                  <p className="text-xs text-muted-app leading-relaxed font-medium">
                    {f.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary-app font-mono">
              SIMPLE 3-STEP WORKFLOW
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-ink-app tracking-tight font-sans">
              From confusing syllabus to complete exam mastery
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-card-app border border-hairline-soft-app rounded-2xl space-y-3 relative">
              <span className="text-3xl font-black text-primary-app/20 font-mono">01</span>
              <h3 className="text-base font-bold text-ink-app">Upload Course PDF</h3>
              <p className="text-xs text-muted-app leading-relaxed">
                Drop your university or school syllabus document. Our AI scans modules, chapters, and topics in seconds.
              </p>
            </div>

            <div className="p-6 bg-card-app border border-hairline-soft-app rounded-2xl space-y-3 relative">
              <span className="text-3xl font-black text-primary-app/20 font-mono">02</span>
              <h3 className="text-base font-bold text-ink-app">Study with Focus Timers</h3>
              <p className="text-xs text-muted-app leading-relaxed">
                Check off chapters as you complete revision. Turn on Pomodoro focus sessions to avoid phone and social media distractions.
              </p>
            </div>

            <div className="p-6 bg-card-app border border-hairline-soft-app rounded-2xl space-y-3 relative">
              <span className="text-3xl font-black text-primary-app/20 font-mono">03</span>
              <h3 className="text-base font-bold text-ink-app">Maintain Daily Momentum</h3>
              <p className="text-xs text-muted-app leading-relaxed">
                Watch your study streaks grow, keep formulas in Keep Notes, and walk into exam halls 100% prepared.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 bg-card-app/40 border-t border-hairline-soft-app">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-primary-app font-mono">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-ink-app tracking-tight font-sans">
              Got questions? We've got answers
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-card-app border border-hairline-soft-app rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-card-strong-app/40 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-bold text-ink-app">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-soft-app shrink-0 transition-transform ${activeFaq === idx ? "rotate-180 text-primary-app" : ""}`} />
                </button>
                {activeFaq === idx && (
                  <div className="px-4.5 pb-4 text-xs text-muted-app leading-relaxed border-t border-hairline-soft-app/50 pt-3 animate-fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-indigo-900/60 via-purple-900/60 to-violet-900/60 border border-indigo-500/20 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight font-sans">
              Ready to take control of your study routine?
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/90 max-w-xl mx-auto font-medium leading-relaxed">
              Start structuring your course syllabus today. No complicated setups, no credit cards required.
            </p>
            <div className="pt-2">
              <button
                onClick={onGetStarted}
                className="px-8 py-3.5 bg-white text-indigo-950 hover:bg-indigo-50 text-sm font-black rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Launch Nocus Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-hairline-soft-app py-8 px-4 sm:px-8 text-center text-xs text-muted-soft-app">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/nocus-logo.png" alt="nocus logo" className="w-5 h-5 object-contain" />
            <span className="font-bold text-ink-app">Nocus Study Workspace</span>
            <span>•</span>
            <span>v2.5.0</span>
          </div>
          <div>
            Built with ❤️ for focused students everywhere.
          </div>
        </div>
      </footer>
    </div>
  );
}

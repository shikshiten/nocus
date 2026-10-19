import React, { useState } from "react";
import { SignIn, SignUp } from "@clerk/react";
import { dark } from "@clerk/themes";
import { motion } from "motion/react";
import {
  Sparkles,
  Timer,
  Flame,
  FolderArchive,
  Target,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  GraduationCap,
  CheckCircle2,
  ChevronDown,
  Compass
} from "lucide-react";

export default function LandingPage() {
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const scrollToAuth = () => {
    const el = document.getElementById("auth-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const features = [
    {
      icon: Sparkles,
      color: "from-amber-500 to-orange-500",
      title: "AI Syllabus Extraction",
      desc: "Drop your syllabus PDF and let intelligent AI extract chapters, units, and learning goals into clean, actionable checkboxes automatically."
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
      desc: "Study privately in your browser. When signed in, all your checklists and notes sync seamlessly across your devices."
    }
  ];

  const faqs = [
    {
      q: "What is Nocus and how does it help students?",
      a: "Nocus is an all-in-one distraction-free study workspace designed specifically for students. Instead of juggling multiple apps for notes, checklists, timers, and syllabus documents, Nocus unifies everything into one seamless, fast dashboard."
    },
    {
      q: "Can I use Nocus completely free?",
      a: "Yes! Nocus is 100% free to use. Create a free Scholar account to sync your study progress across your laptop and phone."
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
    <div className="min-h-screen bg-[#070913] text-slate-100 font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-300 relative overflow-x-hidden">
      {/* Decorative Glow Background Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-violet-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[45%] h-[45%] bg-indigo-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[20%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Navigation */}
      <header className="sticky top-0 z-50 bg-[#070913]/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 transition-colors">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center p-0.5 shadow-md shadow-indigo-600/20 group-hover:scale-105 transition-transform bg-white/5 border border-white/10">
              <img src="/nocus-logo.png" alt="nocus logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col justify-center leading-none">
              <span className="text-[8px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono mb-0.5">
                beta
              </span>
              <span className="font-sans text-lg font-black tracking-tight text-white">
                nocus
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
            <a href="#preview" className="hover:text-white transition-colors">Dashboard Preview</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            <button
              onClick={scrollToAuth}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section with Embedded Login & Highlights */}
      <section className="relative pt-10 sm:pt-16 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          
          {/* Left Column: Headline, Highlights & Guest CTA */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-wide"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Syllabus Tracker & Deep-Work Workspace</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.15]"
            >
              Master your syllabus.
              <br />
              <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                Stay consistent. Ace your exams.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium max-w-2xl mx-auto lg:mx-0"
            >
              Nocus turns complex curriculum PDFs into structured chapter checklists, keeps you disciplined with daily streaks and Pomodoro focus timers, and organizes all your study docs in one sleek space.
            </motion.p>

            {/* Explore Features CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5"
            >
              <a
                href="#features"
                className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Explore Features</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </motion.div>

            {/* Key Value Bullets */}
            <div className="pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-400 max-w-lg mx-auto lg:mx-0 text-left">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant PDF to chapter checklist parsing</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Pomodoro timers with audio notifications</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Daily streak momentum & exam countdown</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Complete offline & private storage</span>
              </div>
            </div>

            {/* Quick Stats Badges */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto lg:mx-0 text-left">
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-lg font-black text-white">Instant</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Parsing</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-lg font-black text-rose-400">🔥 Daily</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Streaks</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-lg font-black text-violet-400">25:00</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Focus Timer</div>
              </div>
              <div className="p-3 bg-white/5 border border-white/10 rounded-2xl">
                <div className="text-lg font-black text-emerald-400">100%</div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Offline Ready</div>
              </div>
            </div>
          </div>

          {/* Right Column: Embedded Login & Sign Up Card */}
          <div id="auth-card" className="lg:col-span-5 flex justify-center">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="w-full max-w-md bg-[#0E0C22]/90 border border-white/15 rounded-3xl p-6 sm:p-7 shadow-2xl backdrop-blur-xl relative overflow-hidden"
            >
              {/* Subtle Card Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              {/* Card Header */}
              <div className="text-center mb-5">
                <div className="inline-flex w-12 h-12 rounded-2xl shadow-lg shadow-indigo-600/20 mb-2 p-1 items-center justify-center bg-white/5 border border-white/10">
                  <img src="/nocus-logo.png" alt="nocus logo" className="w-full h-full object-contain" />
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">Welcome to Nocus</h3>
                <p className="text-xs text-slate-400 mt-0.5">Sign in to sync your study schedule & progress</p>
              </div>

              {/* Mode Switcher Tabs */}
              <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-2xl mb-5 w-full shadow-inner">
                <button
                  type="button"
                  onClick={() => setAuthMode("sign-in")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center ${
                    authMode === "sign-in"
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode("sign-up")}
                  className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center ${
                    authMode === "sign-up"
                      ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Create Account
                </button>
              </div>

              {/* Clerk Sign In / Sign Up Component */}
              <div className="w-full flex justify-center">
                {authMode === "sign-in" ? (
                  <SignIn 
                    routing="hash"
                    appearance={{
                      baseTheme: dark,
                      layout: {
                        logoPlacement: "none",
                        socialButtonsPlacement: "top",
                        showOptionalFields: false,
                      },
                      variables: {
                        colorPrimary: "#4F46E5",
                        colorBackground: "#0E0C22",
                        colorInputBackground: "#13112A",
                        borderRadius: "1rem",
                      },
                      elements: {
                        footer: "hidden",
                        footerAction: "hidden",
                        footerPages: "hidden",
                        footerPagesLink: "hidden",
                        logoBox: "hidden",
                        logoImage: "hidden",
                        headerSubtitle: "hidden",
                      },
                    }}
                  />
                ) : (
                  <SignUp 
                    routing="hash"
                    appearance={{
                      baseTheme: dark,
                      layout: {
                        logoPlacement: "none",
                        socialButtonsPlacement: "top",
                        showOptionalFields: false,
                      },
                      variables: {
                        colorPrimary: "#4F46E5",
                        colorBackground: "#0E0C22",
                        colorInputBackground: "#13112A",
                        borderRadius: "1rem",
                      },
                      elements: {
                        footer: "hidden",
                        footerAction: "hidden",
                        footerPages: "hidden",
                        footerPagesLink: "hidden",
                        logoBox: "hidden",
                        logoImage: "hidden",
                        headerSubtitle: "hidden",
                      },
                    }}
                  />
                )}
              </div>

            </motion.div>
          </div>

        </div>
      </section>

      {/* Interactive App Mockup Preview */}
      <section id="preview" className="py-12 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="p-3 sm:p-5 bg-white/5 rounded-3xl border border-white/10 shadow-2xl backdrop-blur-xs">
          <div className="bg-[#0A0C1B] rounded-2xl border border-white/10 overflow-hidden shadow-inner p-4 sm:p-6 space-y-6">
            
            {/* Mockup Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-white/10 gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-sm">
                  CS
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Computer Networks & Architecture</h3>
                  <p className="text-[10px] text-slate-400 font-mono">Exam in 18 days • 68% Completed</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-full">
                  <span>🔥</span>
                  <span>14 Days Streak</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold rounded-full font-mono">
                  <Timer className="w-3.5 h-3.5" />
                  <span>25:00 Focus</span>
                </div>
              </div>
            </div>

            {/* Mockup Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Syllabus Progress</span>
                <span className="text-indigo-400">17 of 25 Topics Mastered (68%)</span>
              </div>
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full w-[68%]" />
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
                      ? "bg-emerald-500/5 border-emerald-500/20 text-slate-400"
                      : "bg-white/5 border-white/10 text-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center ${
                      item.done ? "bg-emerald-500 text-white" : "border border-white/20 bg-white/5"
                    }`}>
                      {item.done && <CheckCircle2 className="w-3.5 h-3.5" />}
                    </div>
                    <div>
                      <div className={`text-xs font-semibold ${item.done ? "line-through text-slate-500" : "text-white"}`}>
                        {item.title}
                      </div>
                      <div className="text-[10px] text-slate-400">{item.unit}</div>
                    </div>
                  </div>
                  {item.due && (
                    <span className="px-2 py-0.5 text-[9px] font-bold rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                      {item.due}
                    </span>
                  )}
                </div>
              ))}
            </div>

          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 px-4 sm:px-6 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono">
              ENGINEERED FOR SCHOLARS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Everything you need to excel in your studies
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
              Built from the ground up to replace fragmented study tools with one focused, beautifully fast system.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <div
                  key={idx}
                  className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-indigo-500/40 hover:bg-white/[0.07] transition-all space-y-3 group"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">{f.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">
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
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono">
              SIMPLE 3-STEP WORKFLOW
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              From confusing syllabus to complete exam mastery
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3 relative">
              <span className="text-3xl font-black text-indigo-500/30 font-mono">01</span>
              <h3 className="text-base font-bold text-white">Upload Course PDF</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Drop your university or school syllabus document. Our AI scans modules, chapters, and topics in seconds.
              </p>
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3 relative">
              <span className="text-3xl font-black text-indigo-500/30 font-mono">02</span>
              <h3 className="text-base font-bold text-white">Study with Focus Timers</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Check off chapters as you complete revision. Turn on Pomodoro focus sessions to avoid phone and social media distractions.
              </p>
            </div>

            <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-3 relative">
              <span className="text-3xl font-black text-indigo-500/30 font-mono">03</span>
              <h3 className="text-base font-bold text-white">Maintain Daily Momentum</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Watch your study streaks grow, keep formulas in Keep Notes, and walk into exam halls 100% prepared.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 px-4 sm:px-6 bg-white/[0.02] border-t border-white/10">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono">
              FREQUENTLY ASKED QUESTIONS
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Got questions? We've got answers
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all"
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full p-4.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/10 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-bold text-white">{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${activeFaq === idx ? "rotate-180 text-indigo-400" : ""}`} />
                </button>
                {activeFaq === idx && (
                  <div className="px-4.5 pb-4 text-xs text-slate-400 leading-relaxed border-t border-white/10 pt-3 animate-fade-in">
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
        <div className="max-w-4xl mx-auto p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-950 to-violet-950 border border-indigo-500/20 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Ready to take control of your study routine?
            </h2>
            <p className="text-xs sm:text-sm text-indigo-200/90 max-w-xl mx-auto font-medium leading-relaxed">
              Start structuring your course syllabus today. No credit cards or complicated setups required.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={scrollToAuth}
                className="w-full sm:w-auto px-8 py-3.5 bg-white text-indigo-950 hover:bg-indigo-50 text-sm font-black rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer inline-flex items-center justify-center gap-2"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Launch App Free</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={scrollToAuth}
                className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-bold rounded-2xl transition-all cursor-pointer"
              >
                Sign In to Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 px-4 sm:px-8 text-center text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/nocus-logo.png" alt="nocus logo" className="w-5 h-5 object-contain" />
            <span className="font-bold text-white">Nocus Study Workspace</span>
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

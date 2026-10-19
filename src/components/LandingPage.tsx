import React, { useState, useRef, useEffect } from "react";
import { SignIn, SignUp } from "@clerk/react";
import { dark } from "@clerk/themes";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
  useSpring,
  AnimatePresence,
} from "motion/react";
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
  ChevronUp,
} from "lucide-react";
import {
  ScrollProgressBar,
  Reveal,
  StaggerGroup,
  StaggerItem,
  MOTION_CONFIG,
} from "./motion";
import TiltedGridHero from "./ui/tilted-grid-hero";
import { SCHOLAR_IMAGES } from "./ui/tilted-grid-hero-demo";

export default function LandingPage() {
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  // Screen size listener for responsive parallax & 3D tilt
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Global scroll listener for sticky header elevation & scroll hint fade
  const { scrollY } = useScroll();
  useEffect(() => {
    return scrollY.on("change", (latest) => {
      setIsScrolled(latest > 20);
    });
  }, [scrollY]);

  // Hero section scroll parallax with spring smoothing
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress: rawHeroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroProgress = useSpring(rawHeroProgress, MOTION_CONFIG.springPhysics);

  const heroTextY = useTransform(
    heroProgress,
    [0, 1],
    [0, isMobile ? MOTION_CONFIG.heroParallaxMobileY : MOTION_CONFIG.heroParallaxDesktopY]
  );
  const heroTextOpacity = useTransform(
    heroProgress,
    [0, 0.85, 1],
    [1, 0.8, MOTION_CONFIG.heroParallaxOpacityEnd]
  );

  // Soft decorative background glow blobs with depth parallax & spring inertia
  const blob1Y = useTransform(
    heroProgress,
    [0, 1],
    [0, isMobile ? MOTION_CONFIG.blobParallaxMobileY[0] : MOTION_CONFIG.blobParallaxDesktopY[0]]
  );
  const blob2Y = useTransform(
    heroProgress,
    [0, 1],
    [0, isMobile ? MOTION_CONFIG.blobParallaxMobileY[1] : MOTION_CONFIG.blobParallaxDesktopY[1]]
  );
  const blob3Y = useTransform(
    heroProgress,
    [0, 1],
    [0, isMobile ? MOTION_CONFIG.blobParallaxMobileY[2] : MOTION_CONFIG.blobParallaxDesktopY[2]]
  );

  // App Mockup Preview smooth GPU-accelerated entrance without 3D compositor stalls
  const previewRef = useRef<HTMLElement>(null);
  const { scrollYProgress: rawPreviewProgress } = useScroll({
    target: previewRef,
    offset: ["start end", "center center"],
  });
  const previewProgress = useSpring(rawPreviewProgress, {
    stiffness: 280,
    damping: 32,
    mass: 0.08,
    restDelta: 0.001,
  });

  const previewScale = useTransform(previewProgress, [0, 1], [0.97, 1]);
  const previewY = useTransform(previewProgress, [0, 1], [24, 0]);
  const previewGlowOpacity = useTransform(previewProgress, [0, 1], [0.2, 0.6]);

  // How it works section scroll-linked line progress
  const howRef = useRef<HTMLElement>(null);
  const { scrollYProgress: howProgress } = useScroll({
    target: howRef,
    offset: ["start 80%", "end 60%"],
  });
  const howLineScale = useSpring(howProgress, { stiffness: 180, damping: 26 });

  const toggleFaq = (index: number) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const scrollToAuth = () => {
    const el = document.getElementById("auth-card");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const features = [
    {
      icon: Sparkles,
      color: "from-amber-500 to-orange-500",
      title: "AI Syllabus Extraction",
      desc: "Drop your syllabus PDF and let intelligent AI extract chapters, units, and learning goals into clean, actionable checkboxes automatically.",
    },
    {
      icon: Timer,
      color: "from-violet-500 to-purple-500",
      title: "Deep Work Focus Timers",
      desc: "Built-in customizable Pomodoro timers eliminate digital distractions and keep your brain in the optimal flow state during revision sessions.",
    },
    {
      icon: Flame,
      color: "from-rose-500 to-pink-500",
      title: "Daily Streak Habit Engine",
      desc: "Track daily study consistency with dynamic streak visualizers and weekly momentum dots that make studying every day rewarding.",
    },
    {
      icon: FolderArchive,
      color: "from-indigo-500 to-blue-500",
      title: "Integrated Study Vault",
      desc: "Organize up to 7 essential course PDFs and lecture slides directly in your browser with lightning-fast in-app document preview.",
    },
    {
      icon: Target,
      color: "from-emerald-500 to-teal-500",
      title: "Exam Timeline & Deadlines",
      desc: "Set exam targets and let Nocus automatically calculate overdue and pending topics so you always know what to study next.",
    },
    {
      icon: ShieldCheck,
      color: "from-cyan-500 to-blue-500",
      title: "Offline-First & Private",
      desc: "Study privately in your browser. When signed in, all your checklists and notes sync seamlessly across your devices.",
    },
  ];

  const faqs = [
    {
      q: "What is Nocus and how does it help students?",
      a: "Nocus is an all-in-one distraction-free study workspace designed specifically for students. Instead of juggling multiple apps for notes, checklists, timers, and syllabus documents, Nocus unifies everything into one seamless, fast dashboard.",
    },
    {
      q: "Can I use Nocus completely free?",
      a: "Yes! Nocus is 100% free to use. Create a free Scholar account to sync your study progress across your laptop and phone.",
    },
    {
      q: "How does the AI syllabus parser work?",
      a: "Upload any syllabus PDF or copy-paste course text. Our AI analyzes the document structure, separates courses into modules or chapters, and outputs structured checklists with difficulty badges and progress markers.",
    },
    {
      q: "What are the storage limits for the Document Vault?",
      a: "To keep the platform fast, responsive, and organized, each student can store up to 7 documents (5MB max each). Deleted files move to Trash and are safely purged after 7 days.",
    },
    {
      q: "Does Nocus work offline?",
      a: "Yes! Nocus saves your syllabus progress, bookmarks, and keep notes in local browser storage so you can study without uninterrupted internet access.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 font-sans antialiased selection:bg-indigo-500/30 selection:text-indigo-300 relative overflow-x-hidden">
      {/* Top Fixed Reading Progress Indicator */}
      <ScrollProgressBar />

      {/* Decorative Glow Background Spheres with Depth Parallax (contained to prevent phantom scroll space) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0" aria-hidden="true">
        <motion.div
          className="absolute top-[-8%] left-[-10%] w-[55vw] h-[55vw] max-w-[750px] max-h-[750px] rounded-full will-change-transform"
          style={{
            background: "radial-gradient(circle, rgba(124, 58, 237, 0.13) 0%, rgba(79, 70, 229, 0.04) 50%, transparent 70%)",
            ...(shouldReduceMotion ? {} : { y: blob1Y }),
          }}
        />
        <motion.div
          className="absolute top-[22%] right-[-10%] w-[48vw] h-[48vw] max-w-[650px] max-h-[650px] rounded-full will-change-transform"
          style={{
            background: "radial-gradient(circle, rgba(79, 70, 229, 0.13) 0%, rgba(147, 51, 234, 0.04) 50%, transparent 70%)",
            ...(shouldReduceMotion ? {} : { y: blob2Y }),
          }}
        />
        <motion.div
          className="absolute bottom-[2%] left-[20%] w-[42vw] h-[42vw] max-w-[600px] max-h-[600px] rounded-full will-change-transform"
          style={{
            background: "radial-gradient(circle, rgba(168, 85, 247, 0.11) 0%, rgba(99, 102, 241, 0.03) 50%, transparent 70%)",
            ...(shouldReduceMotion ? {} : { y: blob3Y }),
          }}
        />
      </div>

      {/* Sticky Header Navigation */}
      <header
        className={`sticky top-0 z-50 px-4 sm:px-8 py-3.5 transition-all duration-300 ${
          isScrolled
            ? "bg-[#070913]/95 backdrop-blur-xl border-b border-indigo-500/20 shadow-lg shadow-black/40"
            : "bg-[#070913]/70 backdrop-blur-md border-b border-white/10"
        }`}
      >
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
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: MOTION_CONFIG.tapScale }}
              transition={{ duration: 0.15 }}
              onClick={scrollToAuth}
              className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 cursor-pointer flex items-center gap-1.5"
            >
              <span>Sign In</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.button>
          </div>
        </div>
      </header>

      {/* Hero Section with Embedded Login & Highlights */}
      <section
        ref={heroRef}
        className="relative min-h-[calc(100vh-4.5rem)] flex flex-col justify-center pt-8 sm:pt-14 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto"
      >
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto">
          {/* Left Column: Headline, Highlights & Guest CTA with subtle scroll parallax */}
          <motion.div
            style={shouldReduceMotion ? undefined : { y: heroTextY, opacity: heroTextOpacity }}
            className="lg:col-span-7 space-y-6 text-center lg:text-left will-change-transform"
          >
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
              transition={{ delay: 0.1, duration: 0.5, ease: MOTION_CONFIG.ease }}
              className="text-3xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.12]"
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
              transition={{ delay: 0.2, duration: 0.5, ease: MOTION_CONFIG.ease }}
              className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium max-w-2xl mx-auto lg:mx-0"
            >
              Nocus turns complex curriculum PDFs into structured chapter checklists, keeps you disciplined with daily streaks and Pomodoro focus timers, and organizes all your study docs in one sleek space.
            </motion.p>

            {/* Explore Features CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5, ease: MOTION_CONFIG.ease }}
              className="pt-2 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5"
            >
              <motion.a
                href="#features"
                whileHover={{ scale: 1.03, y: MOTION_CONFIG.hoverLiftY }}
                whileTap={{ scale: MOTION_CONFIG.tapScale }}
                transition={{ duration: 0.15 }}
                className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-600/30 cursor-pointer flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Explore Features</span>
                <ChevronRight className="w-4 h-4" />
              </motion.a>
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
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 max-w-2xl mx-auto lg:mx-0 text-left">
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
          </motion.div>

          {/* Right Column: Embedded Login Card (STRICTLY NO parallax or scroll transforms to ensure 100% usability) */}
          <div id="auth-card" className="lg:col-span-5 flex justify-center w-full">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15, duration: 0.5, ease: MOTION_CONFIG.ease }}
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
                    } as any}
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
                    } as any}
                  />
                )}
              </div>
            </motion.div>
          </div>
        </div>

        {/* Hero Section Footer: Trust Bar & Study Ecosystem Strip */}
        <div className="w-full pt-10 sm:pt-14 border-t border-white/10 mt-10 sm:mt-14">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
            {/* Left: Scholar Trust & Rating */}
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2 overflow-hidden">
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#070913] bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white shadow">
                  🎓
                </div>
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#070913] bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-xs font-bold text-white shadow">
                  ⚡
                </div>
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#070913] bg-gradient-to-tr from-rose-500 to-orange-500 flex items-center justify-center text-xs font-bold text-white shadow">
                  🔥
                </div>
                <div className="inline-block h-8 w-8 rounded-full ring-2 ring-[#070913] bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white shadow">
                  📚
                </div>
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1 text-amber-400">
                  <span>★★★★★</span>
                  <span className="text-white font-bold ml-1 text-xs">4.9/5</span>
                </div>
                <span className="text-[11px] text-slate-400">Trusted by 12,000+ students across schools & universities</span>
              </div>
            </div>

            {/* Center: Ecosystem Highlights */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] font-medium text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                100% Free Scholar Access
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                Offline-First Architecture
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                Zero Distraction Flow
              </span>
            </div>

            {/* Right: Quick Anchor to Preview */}
            <a
              href="#preview"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors group cursor-pointer"
            >
              <span>Explore Dashboard</span>
              <ChevronDown className="w-3.5 h-3.5 group-hover:translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </section>

      {/* Interactive App Mockup Preview with smooth GPU-accelerated entrance */}
      <section id="preview" ref={previewRef} className="py-16 sm:py-24 px-4 sm:px-6 max-w-6xl mx-auto relative">
        {/* Soft reactive glow behind mockup that intensifies on scroll (pure GPU radial gradient) */}
        <motion.div
          style={{
            opacity: shouldReduceMotion ? 0.3 : previewGlowOpacity,
            background: "radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.18) 0%, rgba(147, 51, 234, 0.08) 50%, transparent 75%)",
          }}
          className="absolute inset-0 rounded-3xl pointer-events-none -z-10 will-change-opacity"
          aria-hidden="true"
        />

        <motion.div
          style={
            shouldReduceMotion
              ? undefined
              : {
                  scale: previewScale,
                  y: previewY,
                  backfaceVisibility: "hidden",
                  WebkitBackfaceVisibility: "hidden",
                }
          }
          className="p-3 sm:p-5 bg-white/[0.04] rounded-3xl border border-white/10 shadow-2xl will-change-transform"
        >
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
        </motion.div>
      </section>

      {/* Features Grid with whileInView & Stagger Reveal */}
      <section id="features" className="py-20 sm:py-28 px-4 sm:px-6 bg-white/[0.02] border-y border-white/10">
        <div className="max-w-6xl mx-auto space-y-12">
          <Reveal>
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
          </Reveal>

          <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, idx) => {
              const Icon = f.icon;
              return (
                <StaggerItem key={idx}>
                  <motion.div
                    whileHover={{ y: MOTION_CONFIG.hoverLiftY }}
                    whileTap={{ scale: MOTION_CONFIG.tapScale }}
                    transition={{ duration: 0.2 }}
                    className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-indigo-500/40 hover:bg-white/[0.07] transition-colors space-y-3 group cursor-default h-full"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-bold text-white">{f.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      {f.desc}
                    </p>
                  </motion.div>
                </StaggerItem>
              );
            })}
          </StaggerGroup>

          {/* 3D Tilted Curved Stream Showcase */}
          <Reveal delay={0.12}>
            <div className="pt-8 sm:pt-14 space-y-6">
              <div className="text-center max-w-xl mx-auto space-y-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono">
                  LIVE IMMERSIVE VAULT STREAM
                </span>
                <h3 className="text-xl sm:text-3xl font-black text-white tracking-tight">
                  Organize study materials in dynamic 3D flow
                </h3>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-medium">
                  Course notes, formula books, and syllabus modules streaming along a fluid cylinder curve.
                </p>
              </div>

              <TiltedGridHero
                images={SCHOLAR_IMAGES}
                speed={3.6}
                tileHeight={isMobile ? 32 : 28}
                aspectRatio={16 / 9}
                curve={isMobile ? 65 : 80}
                fade={isMobile ? 10 : 14}
                className="h-[380px] sm:h-[480px] w-full rounded-3xl border border-white/10 bg-[#070913] shadow-2xl"
              >
                <div className="relative z-10 flex h-full flex-col items-center justify-between py-8 sm:py-12 text-center pointer-events-none select-none">
                  <div className="px-4 space-y-2 max-w-xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 backdrop-blur-md">
                      ✨ Seamless Cylinder Stream
                    </span>
                    <h4 className="text-2xl sm:text-4xl font-black tracking-tight text-white drop-shadow-lg">
                      Every course file, always in focus
                    </h4>
                  </div>
                  <div className="px-4 max-w-md">
                    <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed drop-shadow bg-[#070913]/70 backdrop-blur-md p-3.5 rounded-2xl border border-white/10">
                      Store syllabus PDFs, lecture slides, and formula sheets directly in your browser. Fully searchable, offline-ready, and synced across devices.
                    </p>
                  </div>
                </div>
              </TiltedGridHero>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How It Works with Scroll-Linked Progress Line & Stagger Reveal */}
      <section id="how-it-works" ref={howRef} className="py-20 sm:py-28 px-4 sm:px-6 relative">
        <div className="max-w-5xl mx-auto space-y-12">
          <Reveal>
            <div className="text-center max-w-xl mx-auto space-y-3">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono">
                SIMPLE 3-STEP WORKFLOW
              </span>
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                From confusing syllabus to complete exam mastery
              </h2>
            </div>
          </Reveal>

          <div className="relative">
            {/* Scroll-linked progress line connecting the steps on desktop */}
            <div className="hidden md:block absolute top-12 left-12 right-12 h-[2px] bg-white/10 -z-0">
              <motion.div
                style={{ scaleX: shouldReduceMotion ? 1 : howLineScale }}
                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-pink-500 origin-left"
                aria-hidden="true"
              />
            </div>

            <StaggerGroup className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
              <StaggerItem>
                <motion.div
                  whileHover={{ y: MOTION_CONFIG.hoverLiftY }}
                  className="p-6 bg-[#0E0C22] border border-white/10 rounded-2xl space-y-3 relative hover:border-indigo-500/30 transition-colors h-full"
                >
                  <span className="text-3xl font-black text-indigo-500/30 font-mono">01</span>
                  <h3 className="text-base font-bold text-white">Upload Course PDF</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Drop your university or school syllabus document. Our AI scans modules, chapters, and topics in seconds.
                  </p>
                </motion.div>
              </StaggerItem>

              <StaggerItem>
                <motion.div
                  whileHover={{ y: MOTION_CONFIG.hoverLiftY }}
                  className="p-6 bg-[#0E0C22] border border-white/10 rounded-2xl space-y-3 relative hover:border-indigo-500/30 transition-colors h-full"
                >
                  <span className="text-3xl font-black text-indigo-500/30 font-mono">02</span>
                  <h3 className="text-base font-bold text-white">Study with Focus Timers</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Check off chapters as you complete revision. Turn on Pomodoro focus sessions to avoid phone and social media distractions.
                  </p>
                </motion.div>
              </StaggerItem>

              <StaggerItem>
                <motion.div
                  whileHover={{ y: MOTION_CONFIG.hoverLiftY }}
                  className="p-6 bg-[#0E0C22] border border-white/10 rounded-2xl space-y-3 relative hover:border-indigo-500/30 transition-colors h-full"
                >
                  <span className="text-3xl font-black text-indigo-500/30 font-mono">03</span>
                  <h3 className="text-base font-bold text-white">Maintain Daily Momentum</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Watch your study streaks grow, keep formulas in Keep Notes, and walk into exam halls 100% prepared.
                  </p>
                </motion.div>
              </StaggerItem>
            </StaggerGroup>
          </div>
        </div>
      </section>

      {/* FAQ Section with Reveal & Stagger */}
      <section id="faq" className="py-20 sm:py-28 px-4 sm:px-6 bg-white/[0.02] border-t border-white/10">
        <div className="max-w-3xl mx-auto space-y-8">
          <Reveal>
            <div className="text-center space-y-2">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono">
                FREQUENTLY ASKED QUESTIONS
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                Got questions? We've got answers
              </h2>
            </div>
          </Reveal>

          <StaggerGroup className="space-y-3">
            {faqs.map((faq, idx) => (
              <StaggerItem key={idx}>
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-colors hover:border-white/20">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4.5 text-left flex items-center justify-between gap-4 cursor-pointer hover:bg-white/5 transition-colors"
                    aria-expanded={activeFaq === idx}
                  >
                    <span className="text-xs sm:text-sm font-bold text-white">{faq.q}</span>
                    <motion.div
                      animate={{ rotate: activeFaq === idx ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-colors ${
                          activeFaq === idx ? "text-indigo-400" : "text-slate-400"
                        }`}
                      />
                    </motion.div>
                  </button>

                  <AnimatePresence initial={false}>
                    {activeFaq === idx && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: MOTION_CONFIG.ease }}
                        className="overflow-hidden"
                      >
                        <div className="px-4.5 pb-4 text-xs text-slate-400 leading-relaxed border-t border-white/10 pt-3">
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </StaggerItem>
            ))}
          </StaggerGroup>
        </div>
      </section>

      {/* Call to Action Banner with Reveal & Micro-Interactions */}
      <section className="py-20 sm:py-28 px-4 sm:px-6">
        <Reveal>
          <div className="max-w-4xl mx-auto p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-indigo-950 via-purple-950 to-violet-950 border border-indigo-500/20 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-4">
              <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
                Ready to take control of your study routine?
              </h2>
              <p className="text-xs sm:text-sm text-indigo-200/90 max-w-xl mx-auto font-medium leading-relaxed">
                Start structuring your course syllabus today. No credit cards or complicated setups required.
              </p>
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: MOTION_CONFIG.tapScale }}
                  transition={{ duration: 0.15 }}
                  onClick={scrollToAuth}
                  className="w-full sm:w-auto px-8 py-3.5 bg-white text-indigo-950 hover:bg-indigo-50 text-sm font-black rounded-2xl shadow-xl transition-all cursor-pointer inline-flex items-center justify-center gap-2"
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Launch App Free</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: MOTION_CONFIG.tapScale }}
                  transition={{ duration: 0.15 }}
                  onClick={scrollToAuth}
                  className="w-full sm:w-auto px-6 py-3.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-bold rounded-2xl transition-all cursor-pointer"
                >
                  Sign In to Account
                </motion.button>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Comprehensive Modern Footer */}
      <footer className="border-t border-white/10 bg-[#05060D] pt-16 pb-12 px-4 sm:px-8 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Main Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 text-left">
            {/* Column 1: Brand & Bio (Spans 2 cols on lg) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center p-0.5 shadow-md shadow-indigo-600/20 bg-white/5 border border-white/10">
                  <img src="/nocus-logo.png" alt="nocus logo" className="w-full h-full object-contain" />
                </div>
                <div className="flex flex-col justify-center leading-none">
                  <span className="text-[8px] font-extrabold uppercase tracking-widest text-indigo-400 font-mono mb-0.5">
                    beta v2.5.0
                  </span>
                  <span className="font-sans text-lg font-black tracking-tight text-white">
                    nocus
                  </span>
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed max-w-sm">
                The all-in-one distraction-free workspace built for serious scholars. Extract syllabus PDFs with AI, track study streaks, and study offline privately.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  All Systems Operational
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  100% Free Forever
                </span>
              </div>
            </div>

            {/* Column 2: Product Features */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">Features</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">AI Syllabus Parser</a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white transition-colors">Pomodoro Focus Timer</a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white transition-colors">Daily Streak Tracker</a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white transition-colors">Document Study Vault</a>
                </li>
                <li>
                  <a href="#features" className="hover:text-white transition-colors">Exam Countdown Calendar</a>
                </li>
              </ul>
            </div>

            {/* Column 3: Study Resources */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">Resources</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a>
                </li>
                <li>
                  <a href="#preview" className="hover:text-white transition-colors">Interactive Preview</a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">Frequently Asked Questions</a>
                </li>
                <li>
                  <button onClick={scrollToAuth} className="hover:text-white transition-colors text-left cursor-pointer">
                    Student Login / Sign Up
                  </button>
                </li>
                <li>
                  <span className="text-slate-500">Formula Sheets (Coming Soon)</span>
                </li>
              </ul>
            </div>

            {/* Column 4: Privacy & Security */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">Privacy & Trust</h4>
              <ul className="space-y-2 text-slate-400">
                <li>
                  <span className="text-slate-300 font-medium">Offline-First Local Storage</span>
                </li>
                <li>
                  <span className="text-slate-300 font-medium">Zero Ad Tracking</span>
                </li>
                <li>
                  <span className="text-slate-300 font-medium">Turso Encrypted Cloud Sync</span>
                </li>
                <li>
                  <span className="text-slate-300 font-medium">Clerk Enterprise Auth</span>
                </li>
                <li>
                  <span className="text-slate-300 font-medium">Student Confidentiality</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar: Copyright, Heart Tag, and Back to Top */}
          <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()} Nocus Study Workspace.</span>
              <span>All rights reserved.</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <span>Built with</span>
              <span className="text-rose-500">❤️</span>
              <span>for focused students, researchers & scholars worldwide.</span>
            </div>

            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
              title="Scroll back to top"
            >
              <span>Back to top</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

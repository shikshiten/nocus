import React from "react";
import { HelpCircle, Sparkles, Flame, CheckCircle2, CloudLightning, RefreshCw, Layers } from "lucide-react";

export default function HelpSupportView() {
  const faqs = [
    {
      q: "How do I upload a syllabus?",
      a: "Go to the checklist view. If no syllabus is loaded, click the 'Track New Subject' button. You can upload a PDF syllabus file or copy-paste text syllabus lists directly. The intelligent parser will instantly build an interactive academic checklist for you!"
    },
    {
      q: "How is my data stored?",
      a: "By default, your subjects, custom notes, and completed tracking parameters are saved in your browser's Local Storage (Guest Mode). To sync your data to our secure Supabase cloud so you can access it on any device, click the sign-in button in the upper right!"
    },
    {
      q: "How does the PDF Vault work?",
      a: "The PDF Vault allows you to upload and organize your academic PDFs. Files are securely stored in Cloudflare R2 and synced across all your devices. Each user can upload up to 7 PDF files, with a size limit of 6MB per file. You can categorize your PDFs into themed folders and tag them for quick searching!"
    },
    {
      q: "What is the Study Streak?",
      a: "The Study Streak motivates daily progress. To increment or protect your streak, complete your custom 'Daily Target' (e.g. 4 topics) before the day ends. The progress streak indicator at the bottom left of your sidebar displays your active consistency!"
    },
    {
      q: "How should I study the topics?",
      a: "We recommend using the integrated Study Timer (Pomodoro Technique) alongside active recall. Read a topic, start a 25-minute Pomodoro block, write custom summarization cards in Keep Study Notes, and test yourself on key definitions!"
    }
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-ink-app font-serif flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary-app" />
          Help & Academic Support
        </h2>
        <p className="text-xs text-muted-soft-app mt-1">
          Learn how to leverage cognitive study techniques and master your subject curriculum.
        </p>
      </div>

      {/* Cognitive techniques cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-surface-app border border-hairline-app p-5 rounded-[24px] space-y-3 shadow-none">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500">
            <Flame className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold uppercase text-ink-app tracking-wider font-serif">
            The Pomodoro Technique
          </h3>
          <p className="text-xs text-muted-app leading-relaxed">
            Study for 25 minutes (one Pomodoro) with absolute focus, then take a 5-minute restorative rest. After 4 sessions, enjoy a longer 15-30 minute break. This boosts visual retention and prevents study burnout.
          </p>
        </div>

        <div className="bg-surface-app border border-hairline-app p-5 rounded-[24px] space-y-3 shadow-none">
          <div className="w-10 h-10 rounded-xl bg-primary-soft-app/20 flex items-center justify-center text-primary-app">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-xs font-bold uppercase text-ink-app tracking-wider font-serif">
            Active Recall & Spaced Repetition
          </h3>
          <p className="text-xs text-muted-app leading-relaxed">
            Rather than passively re-reading chapters, close your books and write everything you remember inside our Keep Study Notes. Review your notes after 1 day, 3 days, and 1 week to flatten the forgetting curve.
          </p>
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-surface-app border border-hairline-app p-6 rounded-[24px] shadow-none space-y-4">
        <h3 className="text-sm font-bold text-ink-app font-serif uppercase tracking-wider border-b border-hairline-soft-app pb-2">
          Frequently Asked Questions
        </h3>

        <div className="space-y-4.5 divide-y divide-hairline-soft-app">
          {faqs.map((faq, idx) => (
            <div key={idx} className={`space-y-1.5 ${idx > 0 ? "pt-4" : ""}`}>
              <h4 className="text-xs font-bold font-serif text-ink-app">
                {faq.q}
              </h4>
              <p className="text-xs text-muted-app leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Support footer */}
      <div className="p-4 bg-primary-soft-app/10 border border-primary-app/10 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-primary-app shrink-0" />
          <span className="text-xs text-primary-app font-bold">
            Need further technical assistance or have questions about syllabus exports?
          </span>
        </div>
        <a
          href="mailto:support@academictracker.com"
          className="px-4 py-2 bg-primary-app hover:bg-primary-app/90 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
        >
          Contact Support
        </a>
      </div>
    </div>
  );
}

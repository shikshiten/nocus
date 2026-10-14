# Nocus — Intelligent Syllabus Tracker & Academic Mentor

A modern full-stack academic platform featuring AI-assisted syllabus structuring, study streak tracking, Pomodoro focus blocks, Keep Study Notes, and Cloudflare R2 academic PDF vault.

## 🚀 Features

- **AI Curriculum Parser:** Extracts full Units, Modules, and Topics from syllabus PDFs or outlines using Google Gemini AI.
- **Interactive Checklists:** Track topic completion, bookmark priority concepts, and maintain daily study targets.
- **Pomodoro Focus Timer:** Integrated 25-minute study intervals with automated 5-minute restorative breaks.
- **Keep Study Notes:** Color-coded active recall cards with pinning and quick search.
- **Cloud PDF Vault:** Secure Cloudflare R2 document storage for textbooks, lecture slides, and past papers.
- **Progress & Consistency Analytics:** Visual consistency metrics powered by Recharts.
- **Indigo Manuscript Theme:** Stunning light and midnight indigo dark mode.
- **Cross-Platform:** Runs as a **PWA** (Installable on iOS, Android, and Desktop) and builds directly to a **Native Android APK** via Capacitor.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Motion (Framer Motion), Recharts, Lucide Icons
- **Backend:** Express.js, TypeScript, TSX, Dotenv
- **AI Engine:** Google Gemini AI (`@google/genai`)
- **Cloud Storage:** Cloudflare R2 (S3-compatible)
- **Database & Auth:** Supabase (`@supabase/supabase-js`)
- **Mobile Packaging:** Capacitor (`@capacitor/android`)
- **Serverless / Edge:** Cloudflare Workers (`wrangler.jsonc`, `worker.ts`)

---

## 💻 Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
   Add your `GEMINI_API_KEY`, Supabase credentials, and Cloudflare R2 keys.

3. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📱 Android APK Build (Capacitor)

1. **Compile and sync web assets:**
   ```bash
   npm run cap:sync
   ```

2. **Open in Android Studio:**
   ```bash
   npm run cap:open
   ```

3. **Build APK:**
   In Android Studio, go to `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`.

---

## ☁️ Cloudflare Workers / Pages Deployment

1. **Login to Cloudflare via Wrangler:**
   ```bash
   npx wrangler login
   ```

2. **Deploy fullstack app to Cloudflare Workers:**
   ```bash
   npm run deploy:worker
   ```

3. **Set Secrets on Cloudflare:**
   ```bash
   npx wrangler secret put GEMINI_API_KEY
   npx wrangler secret put R2_ACCOUNT_ID
   npx wrangler secret put R2_ACCESS_KEY_ID
   npx wrangler secret put R2_SECRET_ACCESS_KEY
   npx wrangler secret put R2_BUCKET_NAME
   ```

---

## 📄 License

MIT

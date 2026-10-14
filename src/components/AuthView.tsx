import React, { useState } from "react";
import { SignIn, SignUp } from "@clerk/react";
import { dark } from "@clerk/themes";
import { motion } from "motion/react";

interface AuthViewProps {
  onGuestMode: () => void;
  primaryColor?: string;
}

export default function AuthView({ onGuestMode }: AuthViewProps) {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 overflow-hidden relative font-sans">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Logo and Header */}
        <div className="text-center mb-6">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="inline-flex w-16 h-16 rounded-2xl shadow-xl shadow-primary-app/20 mb-3 p-1 items-center justify-center bg-white/5 backdrop-blur-md border border-white/10"
          >
            <img src="/nocus-logo.png" alt="nocus logo" className="w-full h-full object-contain" />
          </motion.div>
          <div className="flex flex-col items-center leading-none">
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-violet-400 font-mono mb-1">
              beta
            </span>
            <motion.h1 
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-4xl font-black tracking-tight text-white font-sans leading-none"
            >
              nocus
            </motion.h1>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center p-1 bg-white/5 border border-white/10 rounded-2xl mb-5 w-full max-w-xs shadow-inner">
          <button
            type="button"
            onClick={() => setMode("sign-in")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center ${
              mode === "sign-in"
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => setMode("sign-up")}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer select-none text-center ${
              mode === "sign-up"
                ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/30"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Clerk Sign In / Sign Up component */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="w-full flex justify-center"
        >
          {mode === "sign-in" ? (
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
        </motion.div>

        {/* Toggle Mode Link */}
        <div className="text-center mt-4 text-xs text-slate-400">
          {mode === "sign-in" ? (
            <p>
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("sign-up")}
                className="font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer ml-1"
              >
                Create Account (Sign Up)
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => setMode("sign-in")}
                className="font-bold text-indigo-400 hover:text-indigo-300 underline cursor-pointer ml-1"
              >
                Sign In
              </button>
            </p>
          )}
        </div>

        {/* Guest Mode Button */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6"
        >
          <button
            onClick={onGuestMode}
            className="text-xs font-bold text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-900/60 border border-white/10 px-4 py-2 rounded-full shadow-sm hover:border-white/20 select-none"
          >
            Continue as Guest (Offline Mode)
          </button>
        </motion.div>
      </div>
    </div>
  );
}

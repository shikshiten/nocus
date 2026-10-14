import React, { useState } from "react";
import { supabase } from "../lib/supabase";
import { 
  Mail, 
  Lock, 
  User, 
  LogIn, 
  UserPlus, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  GraduationCap, 
  Loader2,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AuthViewProps {
  onGuestMode: () => void;
  primaryColor?: string;
}

export default function AuthView({ onGuestMode, primaryColor = "indigo" }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validate inputs
    if (!email.trim() || !password.trim()) {
      setError("Please fill out all required fields.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
      } else {
        // Sign Up
        if (!name.trim()) {
          setError("Please enter your name.");
          setLoading(false);
          return;
        }
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
            },
          },
        });
        if (signUpError) throw signUpError;
      }
    } catch (err: any) {
      console.error("Authentication error:", err);
      let friendlyMessage = "An error occurred during authentication.";
      
      const errMsg = err?.message || "";
      
      if (errMsg.includes("Email not confirmed")) {
        friendlyMessage = "Please check your email and confirm your account before signing in.";
      } else if (errMsg.includes("Invalid login credentials")) {
        friendlyMessage = "Incorrect email or password. Please try again.";
      } else if (errMsg.includes("User already registered")) {
        friendlyMessage = "This email is already in use. Try signing in instead!";
      } else if (errMsg.includes("Password should be")) {
        friendlyMessage = "Password is too weak. Please use at least 6 characters.";
      } else if (errMsg.includes("Unable to validate email")) {
        friendlyMessage = "Please enter a valid email address.";
      } else if (errMsg) {
        friendlyMessage = errMsg;
      }
      
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError(null);
    try {
      const redirectUrl = window.location.origin;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: "select_account",
            access_type: "offline",
          },
        },
      });
      if (oauthError) throw oauthError;
    } catch (err: any) {
      console.error("Google Authentication failed:", err);
      let msg = err?.message || "An unexpected error occurred during Google Sign-In.";
      if (msg.toLowerCase().includes("provider is not enabled") || msg.toLowerCase().includes("unsupported provider")) {
        msg = "Google Provider is not enabled in your Supabase project. Go to Supabase Dashboard > Authentication > Providers > Google to enable it and add your Google Client ID/Secret.";
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 md:p-8 overflow-hidden relative font-sans">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[15%] w-[30%] h-[30%] bg-fuchsia-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Header */}
        <div className="text-center mb-8">
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

        {/* Auth Card */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="bg-slate-900/45 border border-white/[0.08] backdrop-blur-xl rounded-[32px] p-6 sm:p-8 shadow-2xl relative overflow-hidden"
        >
          {/* Accent top bar */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-violet-600 via-indigo-500 to-fuchsia-600" />

          {/* Toggle Tabs */}
          <div className="grid grid-cols-2 bg-slate-950/40 p-1.5 rounded-2xl border border-white/[0.04] mb-6">
            <button
              onClick={() => { setIsLogin(true); setError(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                isLogin 
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/10" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(null); }}
              className={`py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                !isLogin 
                  ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/10" 
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign Up
            </button>
          </div>

          {/* Error Message */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-5"
              >
                <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {/* Name field (Sign Up only) */}
            <AnimatePresence>
              {!isLogin && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                  animate={{ height: "auto", opacity: 1, marginBottom: 16 }}
                  exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                  className="overflow-hidden"
                >
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. John Doe"
                      required={!isLogin}
                      className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/[0.08] rounded-xl text-xs font-medium text-white placeholder-slate-550 focus:outline-hidden focus:border-violet-550 transition-colors"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Email Field */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-slate-950/40 border border-white/[0.08] rounded-xl text-xs font-medium text-white placeholder-slate-550 focus:outline-hidden focus:border-violet-550 transition-colors"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-slate-950/40 border border-white/[0.08] rounded-xl text-xs font-medium text-white placeholder-slate-550 focus:outline-hidden focus:border-violet-550 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-violet-600 via-indigo-600 to-fuchsia-600 hover:opacity-95 text-white rounded-xl text-xs font-bold shadow-lg shadow-violet-500/15 hover:shadow-violet-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <>
                  <span>{isLogin ? "Sign In to Dashboard" : "Create Account & Start"}</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-[1px] bg-white/[0.06]" />
            <span className="px-3.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              or continue with
            </span>
            <div className="flex-1 h-[1px] bg-white/[0.06]" />
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={loading}
            className="w-full py-3 bg-slate-950/50 hover:bg-slate-950/80 border border-white/[0.06] hover:border-white/[0.12] rounded-xl text-xs font-bold text-white transition-all duration-200 flex items-center justify-center gap-2.5 cursor-pointer shadow-sm active:scale-[0.98]"
          >
            {/* Google Vector Icon */}
            <svg className="w-4 h-4" viewBox="0 0 24 24" width="16" height="16">
              <path
                fill="#EA4335"
                d="M5.26620003,9.76452941 C6.19875,6.93864706 8.8546875,4.90905882 12,4.90905882 C13.6909375,4.90905882 15.218125,5.52823529 16.4109375,6.54547059 L19.9090625,3.04735294 C17.781875,1.15623529 15.0109375,0 12,0 C7.3090625,0 3.25359375,2.69435294 1.2546875,6.62188235 L5.26620003,9.76452941 Z"
              />
              <path
                fill="#34A853"
                d="M16.0407422,17.3088235 C14.9201172,18.0691176 13.5354297,18.5144118 12.0001172,18.5144118 C8.85480469,18.5144118 6.19886719,16.4848235 5.26631641,13.6589412 L1.25480469,16.8015882 C3.25371094,20.7291176 7.30917969,23.4234706 12.0001172,23.4234706 C14.9754297,23.4234706 17.6536172,22.4417647 19.6827422,20.7621176 L16.0407422,17.3088235 Z"
              />
              <path
                fill="#4285F4"
                d="M23.4900469,12.2727647 C23.4900469,11.4180588 23.4136875,10.5982353 23.2727812,9.81823529 L12,9.81823529 L12,14.4090588 L18.4418437,14.4090588 C18.1636562,15.9109412 17.309125,17.1818235 16.0409531,18.0272353 L19.6829531,21.4805294 C21.8101406,19.5164118 24,16.2081176 24,12.2727647 C24,12.2727647 23.4900469,12.2727647 23.4900469,12.2727647 Z"
              />
              <path
                fill="#FBBC05"
                d="M5.26620003,9.76452941 C5.01815625,10.5117647 4.88184375,11.3110588 4.88184375,12.1411176 C4.88184375,12.9711765 5.01815625,13.7704706 5.26620003,14.5177059 L1.2546875,17.6603529 C0.45453125,16.002 0,14.1235294 0,12.1411176 C0,10.1587059 0.45453125,8.28023529 1.2546875,6.62188235 L5.26620003,9.76452941 Z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>
        </motion.div>

        {/* Footer Link: Guest Mode */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6"
        >
          <button
            onClick={onGuestMode}
            className="text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors cursor-pointer bg-transparent border-0 select-none hover:underline"
          >
            Continue as Guest (Offline Mode)
          </button>
        </motion.div>
      </div>
    </div>
  );
}

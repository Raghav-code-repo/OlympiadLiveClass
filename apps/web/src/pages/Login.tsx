import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { GraduationCap, ShieldCheck, UserCheck, Sparkles } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";

export const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { login, isLoading, error } = useAuthStore();
  const { theme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || "/";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch {
      // Error handled by store
    }
  };

  const handleQuickLogin = async (userEmail: string) => {
    setEmail(userEmail);
    setPassword("Password123!");
    try {
      await login(userEmail, "Password123!");
      navigate(from, { replace: true });
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 light:bg-slate-100 dark:bg-slate-950 px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-[42rem] h-[42rem] bg-gradient-to-br from-sky-600/5 via-indigo-600/3 to-transparent rounded-full blur-3xl pointer-events-none dark:from-sky-600/15 dark:via-indigo-600/5"></div>
      <div className="absolute -bottom-40 -right-40 w-[42rem] h-[42rem] bg-gradient-to-br from-indigo-600/5 via-purple-600/3 to-transparent rounded-full blur-3xl pointer-events-none dark:from-indigo-600/15 dark:via-purple-600/5"></div>

      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-800/60 p-8 rounded-2xl shadow-sm dark:shadow-xl dark:shadow-black/20 relative z-10">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/15 mb-5">
              <GraduationCap className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              OlympiaLive
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Sign in to access your Olympiad live classroom
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300 text-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* 1-Click Demo Accounts */}
          <div className="mt-6 space-y-3">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
              Quick 1-Click Demo Logins
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin("admin@olympiad.edu")}
                className="px-2 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-rose-300 dark:hover:border-rose-500/40 transition-all flex flex-col items-center gap-1"
              >
                <ShieldCheck className="w-4 h-4 text-rose-500" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("hcv@olympiad.edu")}
                className="px-2 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-sky-50 dark:hover:bg-sky-950/30 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-sky-500/40 transition-all flex flex-col items-center gap-1"
              >
                <UserCheck className="w-4 h-4 text-sky-500" />
                <span>Teacher</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickLogin("student1@olympiad.edu")}
                className="px-2 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-amber-50 dark:hover:bg-amber-950/30 text-xs font-medium text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-500/40 transition-all flex flex-col items-center gap-1"
              >
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Student</span>
              </button>
            </div>
          </div>

          <div className="relative flex py-2 items-center mt-6">
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
            <span className="flex-shrink mx-4 text-xs text-slate-400 uppercase">
              or sign in with email
            </span>
            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="e.g. hcv@olympiad.edu"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950 text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950 text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all text-sm disabled:opacity-50"
            >
              {isLoading ? "Signing in..." : "Sign In to Platform"}
            </button>
          </form>

          <p className="text-center text-xs text-slate-500 dark:text-slate-400">
            Don't have an account?{" "}
            <Link
              to="/register"
              className="font-semibold text-sky-500 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition-colors"
            >
              Create an Olympiad account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

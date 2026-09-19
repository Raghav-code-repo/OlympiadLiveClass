import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { GraduationCap, ShieldCheck, Sun, Moon } from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";

export const Register: React.FC = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("STUDENT");
  const { register, isLoading, error } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(name, email, password, role);
      navigate("/", { replace: true });
    } catch {
      // Error handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 light:bg-slate-50 px-4 py-12 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-[42rem] h-[42rem] bg-gradient-to-br from-sky-600/15 via-indigo-600/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-40 -right-40 w-[42rem] h-[42rem] bg-gradient-to-br from-indigo-600/15 via-purple-600/5 to-transparent rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 bg-gradient-to-br from-slate-900 to-slate-950/80 light:from-slate-50 light:to-white border border-slate-800/60 light:border-slate-200 p-8 rounded-2xl shadow-2xl dark:shadow-black/40 relative z-10">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-xl shadow-sky-500/30 mb-5">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
          <h2 className="text-4xl font-extrabold mb-1 bg-gradient-to-r from-white via-sky-200 to-sky-400 bg-clip-text text-transparent light:from-slate-800 light:via-sky-700 light:to-sky-900">
            Join OlympiaLive
          </h2>
          <p className="mt-2 text-sm text-slate-400 light:text-slate-500">
            Create an account to attend live Olympiad classes
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 light:bg-rose-50 border border-rose-500/30 light:border-rose-200 text-rose-300 light:text-rose-700 text-sm">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 light:text-slate-600 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Richard Feynman"
              className="w-full px-4 py-3 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-100 light:text-slate-800 placeholder-slate-500 light:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 light:focus:ring-offset-slate-50 text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 light:text-slate-600 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="student@olympiad.edu"
              className="w-full px-4 py-3 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-100 light:text-slate-800 placeholder-slate-500 light:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 light:focus:ring-offset-slate-50 text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 light:text-slate-600 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="At least 6 characters"
              className="w-full px-4 py-3 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-100 light:text-slate-800 placeholder-slate-500 light:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-950 light:focus:ring-offset-slate-50 text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 light:text-slate-600 uppercase tracking-wider mb-1.5">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950 light:bg-slate-50 border border-slate-800 light:border-slate-300 rounded-xl text-slate-100 light:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
            >
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher / Educator</option>
              <option value="ADMIN">Administrator</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:via-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl shadow-xl shadow-sky-600/30 disabled:opacity-50 text-sm transition-all duration-200 mt-4"
          >
            {isLoading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 light:text-slate-500">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-sky-400 light:text-sky-700 hover:text-sky-300 light:hover:text-sky-600 transition-colors"
          >
            Sign in
          </Link>
        </p>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/50 light:bg-slate-200 text-slate-400 light:text-slate-600 hover:text-sky-400 hover:bg-slate-800/80 light:hover:bg-slate-300 transition-all border border-slate-700 light:border-slate-300"
          title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};

import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useThemeStore } from "../store/useThemeStore";
import {
  GraduationCap,
  LogOut,
  Video,
  BarChart2,
  BookOpen,
  Award,
  Users,
  Layers,
  Sun,
  Moon,
} from "lucide-react";

export const Navbar: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-900/80 backdrop-blur-md light:border-slate-200 light:bg-slate-50/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 group-hover:scale-105 transition-transform">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-sky-200 to-sky-400 bg-clip-text text-transparent light:from-slate-800 light:via-sky-700 light:to-sky-900">
              OlympiaLive
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-950/20 text-sky-400 border border-sky-800 light:bg-sky-100 light:text-sky-700 light:border-sky-200">
              Olympiad Live Class
            </span>
          </div>
        </Link>

        {user && (
          <nav className="hidden md:flex items-center gap-1">
            <Link
              to="/"
              className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-2 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200"
            >
              <Video className="w-4 h-4 text-sky-400" />
              Classrooms
            </Link>

            {(user.role === "TEACHER" || user.role === "ADMIN") && (
              <>
                <Link
                  to="/questions"
                  className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-2 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200"
                >
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  Question Bank
                </Link>
                <Link
                  to="/quiz-builder"
                  className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-2 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200"
                >
                  <Award className="w-4 h-4 text-amber-400" />
                  Quiz Builder
                </Link>
              </>
            )}

            {user.role === "ADMIN" && (
              <>
                <Link
                  to="/subjects"
                  className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-2 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200"
                >
                  <Layers className="w-4 h-4 text-purple-400" />
                  Subjects
                </Link>
                <Link
                  to="/batches"
                  className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-2 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200"
                >
                  <Users className="w-4 h-4 text-teal-400" />
                  Batches
                </Link>
              </>
            )}

            <Link
              to="/analytics"
              className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors flex items-center gap-2 light:text-slate-600 light:hover:text-slate-900 light:hover:bg-slate-200"
            >
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              Analytics
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-xl bg-slate-800/50 text-slate-400 hover:text-sky-400 hover:bg-slate-800/80 transition-all border border-slate-700 light:bg-slate-200 light:border-slate-300 light:text-slate-600 light:hover:bg-slate-300"
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <div className="text-sm font-semibold text-slate-200 light:text-slate-800">
                  {user.name}
                </div>
                <div className="text-xs font-medium text-sky-400 uppercase tracking-wider">
                  {user.role}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors border border-transparent hover:border-rose-900/40 light:text-slate-600 light:hover:text-rose-500 light:hover:bg-rose-50"
                title="Log out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors light:text-slate-600 light:hover:text-slate-900"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 text-sm font-medium bg-sky-600 hover:bg-sky-500 text-white rounded-lg transition-colors shadow-sm"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

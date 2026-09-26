import React, { useEffect, useState, useMemo, useCallback } from "react";
import { RecordingCard } from "../components/RecordingCard";
import { apiRequest } from "../lib/api";
import {
  Search,
  Calendar,
  ChevronDown,
  ChevronUp,
  Film,
  SlidersHorizontal,
} from "lucide-react";

interface Recording {
  id: string;
  classId: string;
  className: string;
  title: string;
  status: string;
  subject?: string;
  teacherName?: string;
  recordedAt?: string;
  thumbnailUrl?: string | null;
  durationSec?: number | null;
  createdAt: string;
}

interface SkeletonCardProps {
  index: number;
}

function SkeletonCard({ index }: SkeletonCardProps) {
  return (
    <div className="bg-white dark:bg-slate-900 light:bg-slate-50 border border-slate-200 dark:border-slate-800/60 light:border-slate-200 rounded-2xl overflow-hidden animate-pulse">
      <div className="aspect-video bg-slate-800 dark:bg-slate-800" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
        <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
        <div className="flex gap-2">
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-16" />
        </div>
      </div>
    </div>
  );
}

export const Recordings: React.FC = () => {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ recordings: Recording[] }>("/api/recordings");
      setRecordings(res.recordings || []);
    } catch (err) {
      console.error("Fetch recordings failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecordings();
  }, []);

  const subjects = useMemo(() => {
    const set = new Set<string>();
    recordings.forEach((r) => {
      if (r.subject) set.add(r.subject);
    });
    return Array.from(set).sort();
  }, [recordings]);

  const filteredAndSorted = useMemo(() => {
    let list = [...recordings];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (r) =>
          (r.className?.toLowerCase().includes(q)) ||
          (r.title?.toLowerCase().includes(q)) ||
          (r.subject?.toLowerCase().includes(q))
      );
    }

    if (subjectFilter !== "all") {
      list = list.filter((r) => r.subject === subjectFilter);
    }

    list.sort((a, b) => {
      const dateA = new Date(a.recordedAt || a.createdAt).getTime();
      const dateB = new Date(b.recordedAt || b.createdAt).getTime();
      return sortDir === "desc" ? dateB - dateA : dateA - dateB;
    });

    return list;
  }, [recordings, searchQuery, subjectFilter, sortDir]);

  const toggleSort = useCallback(() => {
    setSortDir((prev) => (prev === "desc" ? "asc" : "desc"));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-black bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
          Lecture Recordings
        </h1>
        <p className="text-xs text-slate-400">
          Browse and replay past classroom sessions
        </p>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by class name, subject, or title..."
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 dark:bg-slate-900 light:bg-slate-50 border border-slate-700 dark:border-slate-800 light:border-slate-300 rounded-xl text-sm text-slate-200 dark:text-slate-200 light:text-slate-800 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Subject Filter */}
        <div className="relative">
          <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <select
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
            className="appearance-none pl-9 pr-8 py-2.5 bg-slate-900 dark:bg-slate-900 light:bg-slate-50 border border-slate-700 dark:border-slate-800 light:border-slate-300 rounded-xl text-sm text-slate-200 dark:text-slate-200 light:text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent cursor-pointer transition-all"
          >
            <option value="all">All Subjects</option>
            {subjects.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Date Sort Toggle */}
        <button
          onClick={toggleSort}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-sm font-medium transition-all border border-slate-700"
        >
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">
            {sortDir === "desc" ? "Newest First" : "Oldest First"}
          </span>
          {sortDir === "desc" ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Results Count */}
      {!loading && (
        <p className="text-xs text-slate-500">
          {filteredAndSorted.length} recording
          {filteredAndSorted.length !== 1 ? "s" : ""}
          {searchQuery && ` matching "${searchQuery}"`}
          {subjectFilter !== "all" && ` in ${subjectFilter}`}
        </p>
      )}

      {/* Recordings Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </div>
      ) : filteredAndSorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
            <Film className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-bold text-slate-400">No recordings found</h3>
          <p className="text-sm text-slate-500">
            Try adjusting your search or filter criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredAndSorted.map((recording) => (
            <RecordingCard key={recording.id} recording={recording} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Recordings;

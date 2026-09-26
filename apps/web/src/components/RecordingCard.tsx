import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Film, Clock, Calendar, User, GraduationCap } from "lucide-react";

interface RecordingCardProps {
  recording: {
    id: string;
    title: string;
    className?: string;
    subject?: string;
    teacherName?: string;
    recordedAt?: string;
    thumbnailUrl?: string | null;
    durationSec?: number | null;
  };
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const gradientPairs = [
  "from-sky-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-purple-500 to-violet-600",
  "from-cyan-500 to-blue-600",
];

function getGradient(index: number): string {
  return gradientPairs[index % gradientPairs.length];
}

export const RecordingCard: React.FC<RecordingCardProps> = ({ recording }) => {
  const [imgError, setImgError] = useState(false);

  const gradIndex = recording.id
    .split("")
    .reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const gradient = getGradient(gradIndex);

  const subject = recording.subject || recording.className || "";
  const initials = getInitials(subject || "REC");

  return (
    <Link
      to={`/recordings/${recording.id}`}
      className="group block bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 light:border light:border-slate-200 dark:border dark:border-slate-800/60 dark:shadow-xl dark:shadow-black/20 rounded-2xl overflow-hidden border border-slate-200 hover:border-slate-300 dark:hover:border-slate-700/60 hover:shadow-lg transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-slate-900 overflow-hidden">
        {!imgError && recording.thumbnailUrl ? (
          <img
            src={recording.thumbnailUrl}
            alt={recording.title}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : null}
        {(imgError || !recording.thumbnailUrl) && (
          <div
            className={`w-full h-full flex items-center justify-center bg-gradient-to-br ${gradient}`}
          >
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm mb-2">
                <Film className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-bold text-white/90">
                {initials}
              </span>
            </div>
          </div>
        )}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded-md text-[10px] font-semibold text-white">
          {formatDuration(recording.durationSec)}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 space-y-2">
        <h3 className="font-bold text-sm text-slate-800 dark:text-white light:text-slate-800 line-clamp-2 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
          {recording.title}
        </h3>

        {recording.className && (
          <p className="text-xs text-slate-500 dark:text-slate-400 light:text-slate-600 flex items-center gap-1">
            <GraduationCap className="w-3 h-3 shrink-0" />
            <span className="truncate">{recording.className}</span>
          </p>
        )}

        <div className="flex items-center gap-3 pt-1">
          {recording.subject && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/30 light:bg-sky-100 text-[10px] font-semibold text-sky-600 dark:text-sky-400 light:text-sky-700">
              {recording.subject}
            </span>
          )}
          {recording.teacherName && (
            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 light:text-slate-500">
              <User className="w-3 h-3 shrink-0" />
              <span className="truncate">{recording.teacherName}</span>
            </span>
          )}
        </div>

        {recording.recordedAt && (
          <p className="text-[10px] text-slate-400 dark:text-slate-500 light:text-slate-500 flex items-center gap-1">
            <Calendar className="w-3 h-3 shrink-0" />
            {new Date(recording.recordedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
      </div>
    </Link>
  );
};

export default RecordingCard;

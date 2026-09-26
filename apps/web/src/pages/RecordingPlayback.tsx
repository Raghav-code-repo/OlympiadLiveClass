import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import Hls from "hls.js";
import { apiRequest } from "../lib/api";
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  ArrowLeft,
  Clock,
  GraduationCap,
  BookOpen,
  User,
  Calendar,
  ChevronDown,
  Volume2,
} from "lucide-react";

interface StreamRecordingData {
  id: string;
  title: string;
  className?: string;
  subject?: string;
  teacherName?: string;
  recordedAt?: string;
  durationSec?: number;
  playbackUrl?: string;
  streamUrl?: string;
}

export const RecordingPlayback: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [recording, setRecording] = useState<StreamRecordingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [activeQuality, setActiveQuality] = useState<string>("auto");
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const [volume, setVolume] = useState(1);

  const storageKey = useCallback(
    (id: string) => `recording-pos-${id}`,
    []
  );

  // Fetch recording metadata + stream URL
  useEffect(() => {
    if (!classId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setFetchError(false);
        const res = await apiRequest<{ recording: StreamRecordingData }>(
          `/api/recordings/${classId}/stream`
        );
        setRecording(res.recording);
      } catch (err) {
        console.error("Fetch recording stream failed:", err);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [classId]);

  // Initialize HLS / video source
  useEffect(() => {
    if (!recording?.streamUrl || !videoRef.current) return;

    const video = videoRef.current;
    let hls: Hls | null = null;

    const url = recording.streamUrl;

    if (url.includes(".m3u8") && Hls.isSupported()) {
      hls = new Hls({
        capLevelToPlayerSize: true,
        maxBufferLength: 12,
      });
      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const levels = data.levels;
        if (levels && levels.length > 0) {
          const sorted = [...levels].sort((a, b) => b.height - a.height);
          const has1080 = sorted.some((l) => l.height >= 1080);
          const has720 = sorted.some((l) => l.height >= 720);
          const has480 = sorted.some((l) => l.height >= 480);

          const qMap: Record<string, string> = { auto: "auto" };
          if (has1080) qMap["1080p"] = "1080p";
          if (has720) qMap["720p"] = "720p";
          if (has480) qMap["480p"] = "480p";

          hls.currentLevel = -1;
          const stored = localStorage.getItem(
            `recording-quality-${recording.id}`
          );
          if (stored && qMap[stored] !== undefined && stored !== "auto") {
            const level = levels.find(
              (l) =>
                (stored === "1080p" && l.height >= 1080) ||
                (stored === "720p" && l.height >= 720) ||
                (stored === "480p" && l.height >= 480)
            );
            if (level) {
              hls.currentLevel = levels.indexOf(level);
              setActiveQuality(stored);
            }
          } else {
            setActiveQuality("auto");
          }
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        const levels = hlsRef.current?.levels;
        if (levels && data.level >= 0) {
          const h = levels[data.level].height;
          const qLabel = h >= 1080 ? "1080p" : h >= 720 ? "720p" : h >= 480 ? "480p" : "auto";
          setActiveQuality(qLabel);
          localStorage.setItem(
            `recording-quality-${recording.id}`,
            qLabel
          );
        }
      });

      hlsRef.current = hls;
    } else {
      video.src = url;
      video.playbackRate = playbackRate;
    }

    // Resume position: only if > 5 seconds
    const savedTimeStr = localStorage.getItem(storageKey(recording.id));
    if (savedTimeStr) {
      const savedTime = parseFloat(savedTimeStr);
      if (savedTime > 5) {
        setResumeTime(savedTime);
        setShowResumeBanner(true);
      }
    }

    return () => {
      if (hls) {
        hls.destroy();
        hlsRef.current = null;
      }
    };
  }, [recording, playbackRate, storageKey]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const video = videoRef.current;
      if (!video || document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "SELECT" || document.activeElement?.tagName === "TEXTAREA") return;

      if (e.code === "Space") {
        e.preventDefault();
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        video.currentTime = Math.min(video.currentTime + (e.shiftKey ? 10 : 5), duration || video.duration || 0);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        video.currentTime = Math.max(video.currentTime - (e.shiftKey ? 10 : 5), 0);
      } else if (e.code === "ArrowUp") {
        e.preventDefault();
        const newVol = Math.min(video.volume + 0.1, 1);
        video.volume = newVol;
        setVolume(newVol);
      } else if (e.code === "ArrowDown") {
        e.preventDefault();
        const newVol = Math.max(video.volume - 0.1, 0);
        video.volume = newVol;
        setVolume(newVol);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duration]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    setDuration(videoRef.current.duration || recording?.durationSec || 0);
    localStorage.setItem(storageKey(recording?.id || classId || ""), time.toString());
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleResume = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = resumeTime;
    videoRef.current.play().catch(() => {});
    setShowResumeBanner(false);
    localStorage.setItem(storageKey(recording?.id || classId || ""), "0");
  };

  const changeSpeed = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const seekTo = (sec: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = sec;
  };

  const changeQuality = (quality: string) => {
    setActiveQuality(quality);
    if (hlsRef.current && quality !== "auto") {
      const levels = hlsRef.current.levels;
      const match = levels.find(
        (l) =>
          (quality === "1080p" && l.height >= 1080) ||
          (quality === "720p" && l.height >= 720) ||
          (quality === "480p" && l.height >= 480)
      );
      if (match) {
        hlsRef.current.currentLevel = levels.indexOf(match);
      }
    } else if (hlsRef.current) {
      hlsRef.current.currentLevel = -1;
    }
    localStorage.setItem(
      `recording-quality-${recording?.id || classId || ""}`,
      quality
    );
  };

  const formatTime = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs">Loading recording...</span>
        </div>
      </div>
    );
  }

  if (fetchError || !recording) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-300">Recording Not Available</h2>
        <p className="text-sm text-slate-500">
          This recording could not be loaded or is still being processed.
        </p>
        <Link
          to="/recordings"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Recordings
        </Link>
      </div>
    );
  }

  const playbackUrl = recording.streamUrl || recording.playbackUrl || "";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Resume Banner */}
      {showResumeBanner && resumeTime > 5 && (
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-sky-900/60 to-indigo-900/60 border border-sky-700/40 rounded-2xl">
          <div className="flex items-center gap-3">
            <RotateCcw className="w-5 h-5 text-sky-400" />
            <div>
              <p className="text-sm font-semibold text-sky-200">
                Resume from {formatTime(resumeTime)}
              </p>
              <p className="text-[10px] text-sky-300/60">
                Last watched position saved
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowResumeBanner(false)}
              className="px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Dismiss
            </button>
            <button
              onClick={handleResume}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold rounded-lg transition-all"
            >
              Resume
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
            {recording.title}
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            {recording.className && (
              <span className="inline-flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" />
                {recording.className}
              </span>
            )}
            {recording.subject && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-500/30">
                <BookOpen className="w-3.5 h-3.5" />
                {recording.subject}
              </span>
            )}
            {recording.teacherName && (
              <span className="inline-flex items-center gap-1">
                <User className="w-3.5 h-3.5" />
                {recording.teacherName}
              </span>
            )}
            {recording.recordedAt && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(recording.recordedAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            )}
          </div>
        </div>
        <Link
          to="/recordings"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Recordings
        </Link>
      </div>

      {/* Video Container */}
      <div className="relative bg-black rounded-3xl overflow-hidden border border-slate-800/60 shadow-2xl">
        <video
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onLoadedMetadata={() => {
            if (videoRef.current?.duration) {
              setDuration(videoRef.current.duration);
            }
          }}
          className="w-full aspect-video object-contain"
          playsInline
          controls={false}
        />

        {/* Custom Controls */}
        <div className="p-4 bg-gradient-to-t from-slate-900/90 to-slate-900/50 backdrop-blur border-t border-slate-800 space-y-3">
          {/* Progress Bar */}
          <div className="relative w-full h-2.5 bg-slate-800/60 rounded-full cursor-pointer group/bar">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-150"
              style={{
                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/bar:opacity-100 transition-opacity shadow-md"
              style={{ left: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          {/* Controls Row */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className="p-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-sky-600/30 transition-all duration-200"
              >
                {isPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4 ml-0.5" />
                )}
              </button>

              <button
                onClick={() => seekTo(Math.max(currentTime - 5, 0))}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-all"
                title="Rewind 5s"
              >
                <FastForward className="w-4 h-4 rotate-180" />
              </button>

              <button
                onClick={() => seekTo(Math.min(currentTime + 5, duration))}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-all"
                title="Forward 5s"
              >
                <FastForward className="w-4 h-4" />
              </button>

              <span className="text-slate-400 font-mono text-xs hidden sm:inline">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Quality Selector */}
              <div className="relative">
                <button className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-750 rounded-lg transition-all">
                  <span>{activeQuality}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block">
                  <div className="flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl py-1 min-w-[100px]">
                    {["auto", "1080p", "720p", "480p"].map((q) => (
                      <button
                        key={q}
                        onClick={() => changeQuality(q)}
                        className={`px-3 py-1.5 text-xs font-medium text-left transition-colors ${
                          activeQuality === q
                            ? "bg-sky-600/20 text-sky-400"
                            : "text-slate-300 hover:bg-slate-700/60"
                        }`}
                      >
                        {q === "auto" ? "Auto" : q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Speed Selector */}
              <div className="relative group/speed">
                <button className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-750 rounded-lg transition-all">
                  <span>{playbackRate}x</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover/speed:block">
                  <div className="flex flex-col bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl py-1 min-w-[80px]">
                    {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                      <button
                        key={s}
                        onClick={() => changeSpeed(s)}
                        className={`px-3 py-1.5 text-xs font-medium text-left transition-colors ${
                          playbackRate === s
                            ? "bg-sky-600/20 text-sky-400"
                            : "text-slate-300 hover:bg-slate-700/60"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Volume */}
              <div className="flex items-center gap-1">
                <Volume2 className="w-4 h-4 text-slate-500" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.1}
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    if (videoRef.current) videoRef.current.volume = v;
                    setVolume(v);
                  }}
                  className="w-16 h-1 accent-sky-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/50 border border-slate-800/60 rounded-2xl space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Class
          </p>
          <p className="text-sm font-medium text-slate-200">
            {recording.className || "—"}
          </p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800/60 rounded-2xl space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Subject
          </p>
          <p className="text-sm font-medium text-slate-200">
            {recording.subject || "—"}
          </p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800/60 rounded-2xl space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Instructor
          </p>
          <p className="text-sm font-medium text-slate-200">
            {recording.teacherName || "—"}
          </p>
        </div>
        <div className="p-4 bg-slate-900/50 border border-slate-800/60 rounded-2xl space-y-1">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
            Duration
          </p>
          <p className="text-sm font-medium text-slate-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            {recording.durationSec ? formatTime(recording.durationSec) : "—"}
          </p>
        </div>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="flex items-center justify-center gap-4 text-[10px] text-slate-500 flex-wrap">
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Space</kbd>
          Play / Pause
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">←→</kbd>
          Seek 5s
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">Shift + ←→</kbd>
          Seek 10s
        </span>
        <span className="flex items-center gap-1">
          <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-400 font-mono">↑↓</kbd>
          Volume
        </span>
      </div>
    </div>
  );
};

export default RecordingPlayback;

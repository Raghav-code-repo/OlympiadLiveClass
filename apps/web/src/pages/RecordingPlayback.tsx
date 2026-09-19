import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import Hls from "hls.js";
import { apiRequest } from "../lib/api";
import { Play, Pause, RotateCcw, FastForward, Award, ArrowLeft } from "lucide-react";

interface Chapter {
  title: string;
  timeSec: number;
  questionId: string;
}

interface RecordingData {
  id: string;
  classTitle: string;
  durationSec: number;
  playbackUrl: string;
  chapters: Chapter[];
}

export const RecordingPlayback: React.FC = () => {
  const { classId } = useParams<{ classId: string }>();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [recording, setRecording] = useState<RecordingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const fetchRecording = async () => {
      try {
        setLoading(true);
        // Fetch recording for class
        const listRes = await apiRequest<{ recordings: any[] }>(
          `/api/recordings/class/${classId}`
        );
        const first = listRes.recordings?.[0];
        if (first) {
          const detailRes = await apiRequest<{ recording: RecordingData }>(
            `/api/recordings/${first.id}/playback`
          );
          setRecording(detailRes.recording);
        }
      } catch (err) {
        console.error("Fetch recording playback failed:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecording();
  }, [classId]);

  // Hls.js initialization and resume position
  useEffect(() => {
    if (!recording?.playbackUrl || !videoRef.current) return;

    const video = videoRef.current;
    let hls: Hls | null = null;

    if (recording.playbackUrl.includes(".m3u8") && Hls.isSupported()) {
      hls = new Hls({
        capLevelToPlayerSize: true,
      });
      hls.loadSource(recording.playbackUrl);
      hls.attachMedia(video);
    } else {
      video.src = recording.playbackUrl;
    }

    // Resume position
    const savedTime = localStorage.getItem(`recording-pos-${classId}`);
    if (savedTime && parseFloat(savedTime) > 5) {
      video.currentTime = parseFloat(savedTime);
    }

    return () => {
      if (hls) hls.destroy();
    };
  }, [recording, classId]);

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);
    setDuration(videoRef.current.duration || recording?.durationSec || 0);

    // Persist position periodically
    localStorage.setItem(`recording-pos-${classId}`, time.toString());
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

  const changeSpeed = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  };

  const seekTo = (sec: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = sec;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400">
        Loading HLS lecture recording...
      </div>
    );
  }

  if (!recording) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-300">Recording Not Available</h2>
        <p className="text-sm text-slate-500">
          This class does not have an active HLS recording yet or egress is still processing.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      <div className="space-y-1">
        <h1 className="text-3xl font-black bg-gradient-to-r from-sky-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
          {recording.classTitle}
        </h1>
        <p className="text-xs text-slate-400">
          HLS Adaptive Bitrate Stream (1080p / 720p / 480p) with Quiz Chapter Markers
        </p>
      </div>

      {/* Video Container */}
      <div className="relative bg-black rounded-3xl overflow-hidden border border-slate-800/60 shadow-2xl">
        <video
          ref={videoRef}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          className="w-full aspect-video object-contain"
          playsInline
        />

        {/* Custom Seek Bar with Chapter Markers */}
        <div className="p-4 bg-gradient-to-t from-slate-900/90 to-slate-900/50 backdrop-blur border-t border-slate-800 space-y-3">
          {/* Progress bar */}
          <div className="relative w-full h-2.5 bg-slate-800/60 rounded-full cursor-pointer overflow-visible">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all"
              style={{
                width: `${duration ? (currentTime / duration) * 100 : 0}%`,
              }}
            />

            {/* Quiz Chapter Markers */}
            {recording.chapters?.map((chap, idx) => {
              const leftPercent = duration ? (chap.timeSec / duration) * 100 : 0;
              return (
                <button
                  key={idx}
                  onClick={() => seekTo(chap.timeSec)}
                  title={`${chap.title} (${Math.floor(chap.timeSec / 60)}m)`}
                  style={{ left: `${leftPercent}%` }}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-amber-400 border-2 border-slate-900 rounded-full hover:scale-125 transition-transform"
                />
              );
            })}
          </div>

          {/* Controls Bar */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <button
                onClick={handlePlayPause}
                className="p-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-sky-600/30 transition-all duration-200"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <span className="text-slate-400 font-mono text-xs">
                {Math.floor(currentTime / 60)}:
                {String(Math.floor(currentTime % 60)).padStart(2, "0")} /{" "}
                {Math.floor(duration / 60)}:
                {String(Math.floor(duration % 60)).padStart(2, "0")}
              </span>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 mr-2 text-[11px] font-semibold">Speed:</span>
              {[0.75, 1, 1.25, 1.5, 2].map((s) => (
                <button
                  key={s}
                  onClick={() => changeSpeed(s)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                    playbackRate === s
                      ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/20"
                      : "bg-slate-800/60 text-slate-400 hover:text-white hover:bg-slate-750"
                  }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Chapters List */}
      {recording.chapters?.length > 0 && (
                <div className="p-6 bg-gradient-to-br from-slate-900/80 to-slate-950/60 border border-slate-800/50 rounded-3xl space-y-3 shadow-xl">
        <h3 className="font-bold text-sm text-slate-200 flex items-center gap-2">
             <Award className="w-4 h-4 text-amber-400" />
             Class Quiz Chapters & Milestones
           </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {recording.chapters.map((chap, idx) => (
              <button
                key={idx}
                onClick={() => seekTo(chap.timeSec)}
                className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl text-left transition-all group"
              >
                <span className="text-[10px] font-bold text-sky-400">
                  {Math.floor(chap.timeSec / 60)} min : {String(chap.timeSec % 60).padStart(2, "0")}s
                </span>
                <p className="text-xs font-semibold text-slate-200 group-hover:text-white mt-1">
                  {chap.title}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

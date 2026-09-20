import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  VideoTrack,
  useParticipants,
  useRoomContext,
} from "@livekit/components-react";
import { Track, Room } from "livekit-client";
import { useAuthStore } from "../store/useAuthStore";
import { apiRequest } from "../lib/api";
import { getSocket } from "../lib/socket";
import {
  SocketEvents,
  ChatMessageDto,
  LiveQuestionDto,
  LiveAnswerRevealDto,
  LeaderboardEntry,
} from "@repo/shared";
import {
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  MonitorUp,
  Hand,
  MessageSquare,
  Users,
  Award,
  Pin,
  Trash2,
  Send,
  X,
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  BarChart3,
  PhoneOff,
  HelpCircle,
  Radio,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// Video Grid Component
function CustomVideoGrid({ isTeacher }: { isTeacher: boolean }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const screenTrack = tracks.find(
    (t) => t.source === Track.Source.ScreenShare
  );
  const cameraTracks = tracks.filter(
    (t) => t.source === Track.Source.Camera
  );

  return (
    <div className="relative w-full h-full flex flex-col bg-[var(--color-bg)] p-2 sm:p-4 overflow-hidden">
      {/* Screenshare Main Stage if present */}
      {screenTrack ? (
        <div className="relative flex-1 bg-black/80 rounded-2xl overflow-hidden border border-slate-800/60 shadow-2xl mb-2 sm:mb-4 flex items-center justify-center">
          <VideoTrack trackRef={screenTrack as any} className="w-full h-full object-contain" />
          <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-semibold text-sky-400 border border-slate-700">
            🖥️ Screen Share Active
          </div>
        </div>
      ) : null}

      {/* Camera Grid */}
      <div
        className={`w-full ${
          screenTrack ? "h-32 sm:h-44" : "flex-1"
        } grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-4`}
      >
        {cameraTracks.map((trackRef) => {
          const participant = trackRef.participant;
          const isParticipantTeacher =
            participant.metadata &&
            JSON.parse(participant.metadata || "{}").isTeacher;

          return (
            <div
              key={trackRef.publication?.trackSid || participant.identity}
              className="relative bg-slate-900/60 rounded-2xl overflow-hidden border border-slate-800/60 flex items-center justify-center group shadow-lg hover:shadow-xl transition-all duration-300"
            >
              {trackRef.publication && !trackRef.publication.isMuted ? (
                <VideoTrack
                  trackRef={trackRef as any}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center font-bold text-lg text-sky-400 border border-slate-700">
                    {participant.name?.[0] || "U"}
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Camera Off
                  </span>
                </div>
              )}

              {/* Participant Name Tag */}
              <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur px-2.5 py-1 rounded-lg text-xs font-medium text-slate-200 border border-slate-800 flex items-center gap-2">
                <span>{participant.name || "Student"}</span>
                {isParticipantTeacher && (
                  <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                    TEACHER
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {cameraTracks.length === 0 && !screenTrack && (
          <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-500 gap-3 border border-slate-800/80 rounded-2xl p-8 bg-slate-900/30">
            <Radio className="w-10 h-10 text-slate-600 animate-pulse" />
            <p className="text-sm font-medium">Waiting for video stream...</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Bridge: extracts the Room instance from LiveKitRoom context so parent
// can call localParticipant.setMicrophoneEnabled/setCameraEnabled/etc.
const RoomContextBridge: React.FC<{ onRoomReady: (room: Room) => void }> = ({
  onRoomReady,
}) => {
  const room = useRoomContext();
  useEffect(() => {
    onRoomReady(room);
  }, [room, onRoomReady]);
  return null;
};

export const LiveClassroom: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // LiveKit Connection State
  const [liveKitToken, setLiveKitToken] = useState<string | null>(null);
  const [liveKitUrl, setLiveKitUrl] = useState<string>("ws://localhost:7880");
  const [isPublisher, setIsPublisher] = useState<boolean>(false);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const roomRef = useRef<Room | null>(null);

  // Audio / Video states
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(false);
  const [screenShareEnabled, setScreenShareEnabled] = useState(false);

  // Active Panels
  const [activeTab, setActiveTab] = useState<"chat" | "quiz" | "hands" | "participants">("chat");

  // Chat State
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Raised Hands
  const [raisedHands, setRaisedHands] = useState<Array<{ userId: string; name: string }>>([]);
  const [hasHandRaised, setHasHandRaised] = useState(false);

  // Live Quiz State
  const [activeQuestion, setActiveQuestion] = useState<LiveQuestionDto | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [numericAnswer, setNumericAnswer] = useState<string>("");
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [revealData, setRevealData] = useState<LiveAnswerRevealDto | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [liveDistribution, setLiveDistribution] = useState<Record<string, number>>({});

  // Teacher Quiz Launcher State
  const [availableQuestions, setAvailableQuestions] = useState<any[]>([]);

  // 1. Initial Load: Fetch Token & Class Info
  useEffect(() => {
    if (!id) return;

    const init = async () => {
      try {
        setLoading(true);
        const [classRes, tokenRes] = await Promise.all([
          apiRequest<{ class: any }>(`/api/classes/${id}`),
          apiRequest<{
            token: string;
            livekitUrl: string;
            isPublisher: boolean;
          }>(`/api/classes/${id}/token`, { method: "POST" }),
        ]);

        setClassInfo(classRes.class);
        setLiveKitToken(tokenRes.token);
        setLiveKitUrl(tokenRes.livekitUrl || "ws://localhost:7880");
        setIsPublisher(tokenRes.isPublisher);

        // If teacher, fetch available questions for launching
        if (tokenRes.isPublisher) {
          const qRes = await apiRequest<{ questions: any[] }>("/api/questions");
          setAvailableQuestions(qRes.questions || []);
        }
      } catch (err: any) {
        console.error("Live classroom init error:", err);
        alert(err.message || "Failed to enter classroom");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [id]);

  // 2. Socket.IO Realtime Handlers
  useEffect(() => {
    if (!id || !user) return;

    const socket = getSocket();
    socket.connect();

    socket.emit(SocketEvents.ROOM_JOIN, { classId: id });

    // Chat listener
    socket.on(SocketEvents.CHAT_MESSAGE, (msg: ChatMessageDto) => {
      setMessages((prev) => [...prev, msg]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    });

    socket.on(SocketEvents.CHAT_PINNED, ({ messageId, isPinned }: any) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, isPinned } : m))
      );
    });

    socket.on(SocketEvents.CHAT_DELETED, ({ messageId }: any) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    });

    // Hand raise listeners
    socket.on(SocketEvents.HAND_STATE_CHANGED, (data: any) => {
      setRaisedHands(data.raisedHands || []);
      const myHand = (data.raisedHands || []).some(
        (h: any) => h.userId === user.id
      );
      setHasHandRaised(myHand);

      if (data.promotedStudentId === user.id) {
        setIsPublisher(data.canPublish);
        if (data.canPublish) {
          alert("🎤 The teacher has granted you permission to speak!");
        }
      }
    });

    // Live Quiz listeners
    socket.on(SocketEvents.QUIZ_QUESTION_LAUNCHED, (question: LiveQuestionDto) => {
      setActiveQuestion(question);
      setRevealData(null);
      setIsSubmitted(false);
      setSelectedOptions([]);
      setNumericAnswer("");
      setShowLeaderboard(false);
      setActiveTab("quiz");

      const remainingSec = Math.max(
        0,
        Math.round((question.deadlineMs - Date.now()) / 1000)
      );
      setCountdownSeconds(remainingSec);
    });

    socket.on(SocketEvents.QUIZ_ANSWER_CONFIRMED, () => {
      setIsSubmitted(true);
    });

    socket.on(SocketEvents.QUIZ_DISTRIBUTION_UPDATE, (data: any) => {
      setLiveDistribution(data.distribution || {});
    });

    socket.on(SocketEvents.QUIZ_QUESTION_EXPIRED, (reveal: LiveAnswerRevealDto) => {
      setRevealData(reveal);
      setActiveQuestion(null);
    });

    socket.on(SocketEvents.QUIZ_LEADERBOARD_UPDATE, (board: LeaderboardEntry[]) => {
      setLeaderboard(board);
      setShowLeaderboard(true);
    });

    return () => {
      socket.emit(SocketEvents.ROOM_LEAVE, { classId: id });
      socket.off(SocketEvents.CHAT_MESSAGE);
      socket.off(SocketEvents.CHAT_PINNED);
      socket.off(SocketEvents.CHAT_DELETED);
      socket.off(SocketEvents.HAND_STATE_CHANGED);
      socket.off(SocketEvents.QUIZ_QUESTION_LAUNCHED);
      socket.off(SocketEvents.QUIZ_ANSWER_CONFIRMED);
      socket.off(SocketEvents.QUIZ_DISTRIBUTION_UPDATE);
      socket.off(SocketEvents.QUIZ_QUESTION_EXPIRED);
      socket.off(SocketEvents.QUIZ_LEADERBOARD_UPDATE);
    };
  }, [id, user]);

  // Quiz Countdown Timer
  useEffect(() => {
    if (!activeQuestion || countdownSeconds <= 0) return;

    const timer = setInterval(() => {
      setCountdownSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeQuestion, countdownSeconds]);

  // Actions
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !id) return;
    getSocket().emit(SocketEvents.CHAT_SEND, {
      classId: id,
      message: newMessage.trim(),
    });
    setNewMessage("");
  };

   const handleToggleHand = () => {
    if (!id) return;
    const socket = getSocket();
    if (hasHandRaised) {
      socket.emit(SocketEvents.HAND_LOWER, { classId: id });
    } else {
      socket.emit(SocketEvents.HAND_RAISE, { classId: id });
    }
  };

  const handleToggleAudio = async () => {
    if (!roomRef.current) return;
    const newEnabled = !audioEnabled;
    try {
      await roomRef.current.localParticipant.setMicrophoneEnabled(newEnabled);
      setAudioEnabled(newEnabled);
    } catch (err: any) {
      console.error("Failed to toggle microphone:", err);
    }
  };

  const handleToggleVideo = async () => {
    if (!roomRef.current) return;
    const newEnabled = !videoEnabled;
    try {
      await roomRef.current.localParticipant.setCameraEnabled(newEnabled);
      setVideoEnabled(newEnabled);
    } catch (err: any) {
      console.error("Failed to toggle camera:", err);
    }
  };

  const handleToggleScreen = async () => {
    if (!roomRef.current) return;
    const newEnabled = !screenShareEnabled;
    try {
      await roomRef.current.localParticipant.setScreenShareEnabled(newEnabled);
      setScreenShareEnabled(newEnabled);
    } catch (err: any) {
      console.error("Failed to toggle screen share:", err);
    }
  };

  const handleGrantSpeak = (studentId: string, canPublish: boolean) => {
    if (!id) return;
    getSocket().emit(SocketEvents.HAND_GRANT_SPEAK, {
      classId: id,
      studentId,
      canPublish,
    });
  };

  const handleLaunchQuestion = (questionId: string) => {
    if (!id) return;
    getSocket().emit(SocketEvents.QUIZ_LAUNCH_QUESTION, {
      classId: id,
      quizId: classInfo?.quizzes?.[0]?.quiz?.id || "quick-quiz",
      questionId,
    });
  };

  const handleSubmitAnswer = () => {
    if (!id || !activeQuestion || isSubmitted) return;

    const payload: any = {};
    if (activeQuestion.type === "NUMERIC") {
      payload.numericAnswer = parseFloat(numericAnswer);
    } else if (activeQuestion.type === "TRUE_FALSE") {
      payload.booleanAnswer = selectedOptions[0] === "true";
    } else {
      payload.selectedOptionIds = selectedOptions;
    }

    getSocket().emit(SocketEvents.QUIZ_SUBMIT_ANSWER, {
      classId: id,
      questionId: activeQuestion.questionId,
      quizId: activeQuestion.quizId,
      payload,
      clientTimestampMs: Date.now(),
    });
  };

  const handleManualReveal = () => {
    if (!id) return;
    getSocket().emit(SocketEvents.QUIZ_REVEAL_ANSWER, { classId: id });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Connecting to Live Classroom...</span>
        </div>
      </div>
    );
  }

  const pinnedMessage = messages.find((m) => m.isPinned);

  // Distribution chart data
  const chartData = activeQuestion
    ? activeQuestion.options.map((opt) => ({
        name: `Option ${opt.id}`,
        count: liveDistribution[opt.id] || 0,
      }))
    : [];

  return (
    <div className="fixed inset-0 top-16 bg-[var(--color-bg)] flex flex-col overflow-hidden">
      {/* Top Classroom Bar */}
      <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 px-4 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              LIVE
            </span>
          </div>
          <h2 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
            {classInfo?.title}
          </h2>
          <span className="hidden sm:inline-block text-xs text-slate-400 border-l border-slate-700 pl-3">
            {classInfo?.batch?.name}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isPublisher && (
            <button
              onClick={() => setActiveTab("quiz")}
              className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-500/30 transition-all"
            >
              <Award className="w-3.5 h-3.5" />
              <span>Launch Quiz</span>
            </button>
          )}
          <button
            onClick={() => navigate("/")}
            className="px-3 py-1 bg-rose-950/40 text-rose-400 border border-rose-800/40 hover:bg-rose-900/40 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
          >
            <PhoneOff className="w-3.5 h-3.5" />
            <span>Leave</span>
          </button>
        </div>
      </div>

      {/* Main Classroom Body: Video Stage + Side Drawer */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* LiveKit Video Stage */}
        <div className="flex-1 relative flex flex-col overflow-hidden">
          {liveKitToken ? (
            <LiveKitRoom
              token={liveKitToken}
              serverUrl={liveKitUrl}
              video={isPublisher}
              audio={isPublisher}
              connect={true}
              className="w-full h-full flex flex-col relative"
            >
              <RoomAudioRenderer />
              <CustomVideoGrid isTeacher={isPublisher} />
              <RoomContextBridge
                onRoomReady={(room) => {
                  roomRef.current = room;
                }}
              />
            </LiveKitRoom>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500">
              Video stream offline
            </div>
          )}

           {/* Student / Teacher Control Bar */}
           <div className="h-16 border-t border-slate-200 dark:border-slate-800/60 bg-white dark:bg-slate-900/95 backdrop-blur px-4 flex items-center justify-between z-20">
             <div className="flex items-center gap-2">
              <button
                 onClick={handleToggleAudio}
                className={`p-2.5 rounded-xl border transition-all ${
                  audioEnabled
                    ? "bg-slate-800 text-white border-slate-700"
                    : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                }`}
                title={audioEnabled ? "Mute Mic" : "Unmute Mic"}
              >
                {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </button>

              <button
                 onClick={handleToggleVideo}
                className={`p-2.5 rounded-xl border transition-all ${
                  videoEnabled
                    ? "bg-slate-800 text-white border-slate-700"
                    : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                }`}
                title={videoEnabled ? "Turn Off Video" : "Turn On Video"}
              >
                {videoEnabled ? <VideoIcon className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </button>

              {isPublisher ? (
                <button
                   onClick={handleToggleScreen}
                  className={`p-2.5 rounded-xl border transition-all ${
                    screenShareEnabled
                      ? "bg-sky-600 text-white border-sky-500"
                      : "bg-slate-800 text-slate-300 border-slate-700 hover:text-white"
                  }`}
                  title="Share Screen"
                >
                  <MonitorUp className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={handleToggleHand}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
                    hasHandRaised
                      ? "bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-lg shadow-amber-500/20"
                      : "bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-750"
                  }`}
                >
                  <Hand className={`w-4 h-4 ${hasHandRaised ? "animate-bounce" : ""}`} />
                  <span>{hasHandRaised ? "Hand Raised" : "Raise Hand"}</span>
                </button>
              )}
            </div>

            {/* Panel Tabs */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setActiveTab("chat")}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === "chat"
                    ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Chat</span>
              </button>

              <button
                onClick={() => setActiveTab("quiz")}
                className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all relative ${
                  activeTab === "quiz"
                    ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/25"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Award className="w-4 h-4" />
                <span className="hidden sm:inline">Quiz</span>
                {activeQuestion && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                )}
              </button>

              {isPublisher && (
                <button
                  onClick={() => setActiveTab("hands")}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all relative ${
                    activeTab === "hands"
                      ? "bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-600/25"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                  }`}
                >
                  <Hand className="w-4 h-4" />
                  <span className="hidden sm:inline">Hands</span>
                  {raisedHands.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold rounded-full text-[10px]">
                      {raisedHands.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Side Panel (Chat, Live Quiz, Hands) */}
         <div className="w-full md:w-96 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/95 flex flex-col h-72 md:h-full z-10 shadow-lg dark:shadow-2xl dark:shadow-black/20">
          {/* TAB 1: LIVE CHAT */}
          {activeTab === "chat" && (
            <div className="flex-1 flex flex-col h-full">
                <div className="p-3 border-b border-slate-200 dark:border-slate-800/60 flex items-center justify-between bg-slate-50 dark:bg-slate-900/40">
                 <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                   <MessageSquare className="w-4 h-4 text-sky-400" />
                   Class Discussion
                 </span>
                 <span className="text-[11px] text-slate-500">Live Socket.IO</span>
               </div>

              {/* Pinned Message Banner */}
              {pinnedMessage && (
                <div className="p-2.5 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                  <Pin className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 truncate">
                    <span className="font-semibold">{pinnedMessage.userName}: </span>
                    {pinnedMessage.message}
                  </div>
                </div>
              )}

              {/* Message History */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    No messages yet. Ask a question!
                  </div>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-xl text-xs space-y-1 ${
                        m.userId === user?.id
                          ? "bg-sky-950/50 border border-sky-800/40 ml-4"
                          : "bg-slate-800/60 border border-slate-750 mr-4"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-semibold text-slate-300">
                          {m.userName}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {m.userRole === "TEACHER" && (
                            <span className="px-1 bg-indigo-500/20 text-indigo-400 rounded text-[9px] font-bold">
                              TEACHER
                            </span>
                          )}
                          {isPublisher && (
                            <button
                              onClick={() =>
                                getSocket().emit(SocketEvents.CHAT_PIN, {
                                  classId: id,
                                  messageId: m.id,
                                  isPinned: !m.isPinned,
                                })
                              }
                              className="text-slate-400 hover:text-amber-400"
                              title="Pin message"
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                          )}
                          {isPublisher && (
                            <button
                              onClick={() =>
                                getSocket().emit(SocketEvents.CHAT_DELETE, {
                                  classId: id,
                                  messageId: m.id,
                                })
                              }
                              className="text-slate-400 hover:text-rose-400"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-200 break-words">{m.message}</p>
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input */}
               <form
                 onSubmit={handleSendMessage}
                 className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 bg-white dark:bg-slate-950"
               >
                 <input
                   type="text"
                   value={newMessage}
                   onChange={(e) => setNewMessage(e.target.value)}
                   placeholder="Ask doubts or discuss..."
                   className="flex-1 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800/60 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-950 transition-all"
                 />
                 <button
                   type="submit"
                   className="p-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl shadow-lg shadow-sky-600/30 transition-all duration-200"
                 >
                   <Send className="w-4 h-4" />
                 </button>
               </form>
            </div>
          )}

          {/* TAB 2: LIVE QUIZ ENGINE (The Differentiator) */}
          {activeTab === "quiz" && (
            <div className="flex-1 flex flex-col h-full p-4 overflow-y-auto space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  Live Olympiad Quiz Engine
                </span>
                {activeQuestion && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {countdownSeconds}s
                  </span>
                )}
              </div>

              {/* 1. Active Question Answering Interface */}
              {activeQuestion ? (
             <div className="space-y-4 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm dark:shadow-xl dark:shadow-black/20">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-medium">
                      {activeQuestion.type}
                    </span>
                    <span>+{activeQuestion.marks} / -{activeQuestion.negativeMarks}</span>
                  </div>

                  <p className="text-xs text-slate-100 font-medium leading-relaxed">
                    {activeQuestion.stem}
                  </p>

                  {/* MCQ Options */}
                  {(activeQuestion.type === "MCQ_SINGLE" ||
                    activeQuestion.type === "MCQ_MULTI" ||
                    activeQuestion.type === "TRUE_FALSE") && (
                    <div className="space-y-2">
                      {activeQuestion.options.map((opt) => {
                        const isSelected = selectedOptions.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            disabled={isSubmitted || countdownSeconds === 0}
                            onClick={() => {
                              if (activeQuestion.type === "MCQ_MULTI") {
                                setSelectedOptions((prev) =>
                                  prev.includes(opt.id)
                                    ? prev.filter((x) => x !== opt.id)
                                    : [...prev, opt.id]
                                );
                              } else {
                                setSelectedOptions([opt.id]);
                              }
                            }}
                            className={`w-full text-left p-3 rounded-xl text-xs border transition-all duration-200 flex items-center justify-between ${
                              isSelected
                                ? "bg-gradient-to-r from-sky-600/20 to-indigo-600/20 border-sky-500 text-sky-200 font-semibold shadow-md"
                                : "bg-slate-900/60 border-slate-800/60 text-slate-300 hover:bg-slate-800/60 hover:border-slate-700 hover:text-slate-200"
                            }`}
                          >
                            <span>
                              <strong className="mr-2 text-sky-400">{opt.id}.</strong>
                              {opt.text}
                            </span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Numeric Input */}
                  {activeQuestion.type === "NUMERIC" && (
                    <div className="space-y-2">
                      <label className="text-xs text-slate-400">Enter Value:</label>
                      <input
                        type="number"
                        step="any"
                        disabled={isSubmitted || countdownSeconds === 0}
                        value={numericAnswer}
                        onChange={(e) => setNumericAnswer(e.target.value)}
                        placeholder="e.g. 45.0"
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-white text-xs"
                      />
                    </div>
                  )}

                  {/* Submit Button */}
                  {!isPublisher && (
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={
                        isSubmitted ||
                        countdownSeconds === 0 ||
                        (activeQuestion.type === "NUMERIC"
                          ? !numericAnswer
                          : selectedOptions.length === 0)
                      }
                       className="w-full py-2.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 shadow-xl shadow-sky-600/25"
                    >
                      {isSubmitted
                        ? "✓ Submitted to Server"
                        : countdownSeconds === 0
                        ? "Time Expired"
                        : "Submit Answer"}
                    </button>
                  )}

                  {/* Teacher: Live Response Distribution Chart */}
                  {isPublisher && chartData.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-slate-800">
                      <div className="text-[11px] font-semibold text-slate-400 flex items-center justify-between">
                        <span>Live Student Response Distribution</span>
                        <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
                      </div>
                      <div className="h-36 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData}>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
                            <YAxis allowDecimals={false} stroke="#64748b" fontSize={10} />
                            <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderRadius: 8 }} />
                            <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      <button
                        onClick={handleManualReveal}
                        className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        Reveal Answer Now
                      </button>
                    </div>
                  )}
                </div>
              ) : null}

              {/* 2. Answer Reveal & Explanation */}
              {revealData && (
                <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
                  <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
                    <span>Correct Answer Revealed!</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
                    <span className="text-slate-400">Correct: </span>
                    <span className="font-bold text-emerald-400">
                      {revealData.correctAnswer}
                    </span>
                  </div>
                  {revealData.explanation && (
                    <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="font-semibold text-sky-400">Explanation: </span>
                      {revealData.explanation}
                    </div>
                  )}
                  <button
                    onClick={() => setShowLeaderboard(true)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    View Live Leaderboard
                  </button>
                </div>
              )}

              {/* 3. Teacher Question Bank Launcher */}
              {isPublisher && !activeQuestion && (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Launch a Problem from Question Bank
                  </span>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {availableQuestions.map((q) => (
                      <div
                        key={q.id}
                        className="p-3 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs space-y-2"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span className="font-semibold text-sky-400">{q.topic}</span>
                          <span className="px-1.5 py-0.5 bg-slate-900 rounded">{q.difficulty}</span>
                        </div>
                        <p className="text-slate-200 line-clamp-2">{q.stem}</p>
                        <button
                          onClick={() => handleLaunchQuestion(q.id)}
                          className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg font-semibold text-xs transition-colors"
                        >
                          Launch Question to Classroom
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!activeQuestion && !revealData && !isPublisher && (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Waiting for the teacher to launch the next Olympiad question...
                </div>
              )}
            </div>
          )}

          {/* TAB 3: RAISED HANDS (Teacher Promotion Queue) */}
          {activeTab === "hands" && isPublisher && (
            <div className="flex-1 flex flex-col h-full p-4 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Hand className="w-4 h-4" />
                Raised Hands Queue ({raisedHands.length})
              </span>
              <div className="flex-1 overflow-y-auto space-y-2">
                {raisedHands.length === 0 ? (
                  <div className="text-xs text-slate-500 text-center py-8">
                    No students currently raising hand.
                  </div>
                ) : (
                  raisedHands.map((h) => (
                    <div
                      key={h.userId}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-200">{h.name}</span>
                      <button
                        onClick={() => handleGrantSpeak(h.userId, true)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg text-xs"
                      >
                        Grant Speak
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Leaderboard Modal with Podium */}
      {showLeaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-400 animate-bounce" />
                <h3 className="text-lg font-extrabold text-white">
                  Olympiad Live Leaderboard
                </h3>
              </div>
              <button
                onClick={() => setShowLeaderboard(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Top 3 Podium */}
            {leaderboard.length >= 3 && (
              <div className="flex items-end justify-center gap-3 pt-4">
                {/* 2nd Place */}
                <div className="flex flex-col items-center">
                  <div className="text-xs font-bold text-slate-300 mb-1">
                    {leaderboard[1].name.split(" ")[0]}
                  </div>
                  <div className="w-20 h-20 bg-slate-800 border border-slate-700 rounded-t-2xl flex flex-col items-center justify-center">
                    <span className="text-xl font-black text-slate-300">2</span>
                    <span className="text-[10px] text-sky-400 font-semibold">
                      {leaderboard[1].score} pts
                    </span>
                  </div>
                </div>

                {/* 1st Place */}
                <div className="flex flex-col items-center">
                  <div className="text-xs font-bold text-amber-300 mb-1">
                    👑 {leaderboard[0].name.split(" ")[0]}
                  </div>
                  <div className="w-24 h-28 bg-gradient-to-t from-amber-600/30 to-amber-500/50 border border-amber-400/60 rounded-t-2xl flex flex-col items-center justify-center shadow-lg shadow-amber-500/20">
                    <span className="text-3xl font-black text-amber-300">1</span>
                    <span className="text-xs text-amber-200 font-bold">
                      {leaderboard[0].score} pts
                    </span>
                  </div>
                </div>

                {/* 3rd Place */}
                <div className="flex flex-col items-center">
                  <div className="text-xs font-bold text-amber-600 mb-1">
                    {leaderboard[2].name.split(" ")[0]}
                  </div>
                  <div className="w-20 h-16 bg-slate-800/80 border border-slate-700 rounded-t-2xl flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-amber-600">3</span>
                    <span className="text-[10px] text-sky-400 font-semibold">
                      {leaderboard[2].score} pts
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard Table with Tiebreak display */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {leaderboard.map((entry) => (
                <div
                  key={entry.userId}
                  className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between ${
                    entry.userId === user?.id
                      ? "bg-sky-600/30 border border-sky-500 text-white font-bold"
                      : "bg-slate-950/60 border border-slate-800 text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 text-center font-bold text-slate-400">
                      #{entry.rank}
                    </span>
                    <span>{entry.name}</span>
                  </div>
                  <div className="flex items-center gap-3 text-right">
                    <span className="text-[10px] text-slate-400">
                      {Math.round(entry.totalTimeTakenMs / 1000)}s
                    </span>
                    <span className="font-bold text-sky-400">{entry.score} pts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

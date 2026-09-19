import React, { useEffect, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { apiRequest } from "../lib/api";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Award, Clock, CheckCircle2, TrendingUp, Users } from "lucide-react";

export const Analytics: React.FC = () => {
  const { user } = useAuthStore();
  const [studentData, setStudentData] = useState<any>(null);
  const [teacherData, setTeacherData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        if (user?.role === "STUDENT") {
          const res = await apiRequest<{ analytics: any }>("/api/analytics/student");
          setStudentData(res.analytics);
        } else {
          const res = await apiRequest<{ analytics: any }>("/api/analytics/teacher");
          setTeacherData(res.analytics);
        }
      } catch (err) {
        console.error("Analytics fetch failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 light:bg-slate-100 dark:bg-slate-950 text-slate-500 light:text-slate-600 dark:text-slate-400 text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Compiling Olympiad performance analytics...</span>
        </div>
      </div>
    );
  }

  const cardBg = "bg-white light:shadow-md dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 dark:border dark:border-slate-800/60 dark:shadow-xl dark:shadow-black/20 light:border light:border-slate-200 light:shadow-sm rounded-3xl";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 dark:from-sky-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent tracking-tight">
          Performance Analytics & Insights
        </h1>
        <p className="text-xs text-slate-500 light:text-slate-600 dark:text-slate-400 mt-1">
          {user?.role === "STUDENT"
            ? "Track your problem accuracy, response speeds, rank trajectories, and attendance."
            : "Review question difficulty indices, most-missed topics, and classroom engagement."}
        </p>
      </div>

      {/* STUDENT VIEW */}
      {user?.role === "STUDENT" && studentData && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className={`${cardBg} p-6 space-y-2`}>
              <span className="text-xs font-semibold text-slate-500 light:text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-sky-500 dark:text-sky-400" />
                Accuracy
              </span>
              <div className="text-2xl font-black text-slate-800 dark:text-white">
                {studentData.averageAccuracy}%
              </div>
            </div>

            <div className={`${cardBg} p-6 space-y-2`}>
              <span className="text-xs font-semibold text-slate-500 light:text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Watch Minutes
              </span>
              <div className="text-2xl font-black text-slate-800 dark:text-white">
                {studentData.totalWatchMins}m
              </div>
            </div>

            <div className={`${cardBg} p-6 space-y-2`}>
              <span className="text-xs font-semibold text-slate-500 light:text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                Attendance %
              </span>
              <div className="text-2xl font-black text-slate-800 dark:text-white">
                {studentData.attendancePercentage}%
              </div>
            </div>

            <div className={`${cardBg} p-6 space-y-2`}>
              <span className="text-xs font-semibold text-slate-500 light:text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                Quizzes Taken
              </span>
              <div className="text-2xl font-black text-slate-800 dark:text-white">
                {studentData.totalAttempts}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Topic Accuracy Bar Chart */}
            <div className={`${cardBg} p-6 space-y-4`}>
              <h3 className="font-bold text-sm text-slate-700 light:text-slate-800 dark:text-slate-200">
                Accuracy by Olympiad Topic (%)
              </h3>
              <div className="h-64 w-full text-slate-400 light:text-slate-500">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={studentData.topicBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="topic" stroke="#94a3b8" fontSize={10} tick={{ fill: "currentColor" }} />
                    <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: "currentColor" }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</p>
                            <p className="text-xs text-sky-600 dark:text-sky-400">{payload[0].value}% accuracy</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="accuracy" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Rank Trend Line Chart */}
            <div className={`${cardBg} p-6 space-y-4`}>
              <h3 className="font-bold text-sm text-slate-700 light:text-slate-800 dark:text-slate-200">
                Rank Progression Trend
              </h3>
              <div className="h-64 w-full text-slate-400 light:text-slate-500">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={studentData.rankTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tick={{ fill: "currentColor" }} />
                    <YAxis reversed domain={[1, 20]} stroke="#94a3b8" fontSize={10} tick={{ fill: "currentColor" }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</p>
                            <p className="text-xs text-amber-600 dark:text-amber-400">Rank: {payload[0].value}</p>
                          </div>
                        );
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="rank"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ fill: "#f59e0b", r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEACHER / ADMIN VIEW */}
      {(user?.role === "TEACHER" || user?.role === "ADMIN") && teacherData && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Most Missed Topics */}
            <div className={`${cardBg} p-6 space-y-4`}>
              <h3 className="font-bold text-sm text-slate-700 light:text-slate-800 dark:text-slate-200">
                Most-Missed Topics (Error Rate %)
              </h3>
              <div className="h-64 w-full text-slate-400 light:text-slate-500">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teacherData.mostMissedTopics}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="topic" stroke="#94a3b8" fontSize={10} tick={{ fill: "currentColor" }} />
                    <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: "currentColor" }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</p>
                            <p className="text-xs text-rose-600 dark:text-rose-400">{payload[0].value}% miss rate</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="missRate" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Class Engagement */}
            <div className={`${cardBg} p-6 space-y-4`}>
              <h3 className="font-bold text-sm text-slate-700 light:text-slate-800 dark:text-slate-200">
                Classroom Attendee Engagement
              </h3>
              <div className="h-64 w-full text-slate-400 light:text-slate-500">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teacherData.classEngagement}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                    <XAxis dataKey="title" stroke="#94a3b8" fontSize={9} tick={{ fill: "currentColor" }} />
                    <YAxis stroke="#94a3b8" fontSize={10} tick={{ fill: "currentColor" }} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (!active || !payload?.length) return null;
                        return (
                          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg">
                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{label}</p>
                            <p className="text-xs text-emerald-600 dark:text-emerald-400">{payload[0].payload.attendeeCount} attendees</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="attendeeCount" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Question Difficulty Index Table */}
          <div className={`${cardBg} p-6 space-y-4`}>
            <h3 className="font-bold text-sm text-slate-700 light:text-slate-800 dark:text-slate-200">
              Question Difficulty Index (1.0 = Hardest, 0.0 = Easiest)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/60 text-slate-500 light:text-slate-600 dark:text-slate-400">
                    <th className="pb-3">Topic</th>
                    <th className="pb-3">Stem</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Pass Rate</th>
                    <th className="pb-3 text-right">Difficulty Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {teacherData.questionDifficultyIndex.map((q: any) => (
                    <tr
                      key={q.questionId}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40"
                    >
                      <td className="py-2.5 font-semibold text-slate-800 light:text-slate-900 dark:text-slate-200">{q.topic}</td>
                      <td className="py-2.5 text-slate-500 light:text-slate-600 dark:text-slate-400 max-w-xs truncate">{q.stem}</td>
                      <td className="py-2.5 text-slate-500 light:text-slate-600 dark:text-slate-400">{q.type}</td>
                      <td className="py-2.5 text-emerald-600 dark:text-emerald-400 font-semibold">{q.passRate}%</td>
                      <td className="py-2.5 text-right font-bold text-sky-600 dark:text-sky-400">
                        {q.difficultyIndex}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
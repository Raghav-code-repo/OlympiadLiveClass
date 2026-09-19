import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { apiRequest } from "../lib/api";
import {
  Video,
  Clock,
  Calendar,
  Users,
  PlusCircle,
  PlayCircle,
  Film,
  Sparkles,
  BookOpen,
  GraduationCap,
  ChevronRight,
  UserPlus,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from "lucide-react";

interface ClassItem {
  id: string;
  title: string;
  description?: string;
  subject: string;
  status: string;
  scheduledAt: string;
  durationMins: number;
  teacher?: { name: string; email: string };
  batch?: { name: string; code: string };
  _count?: { attendances: number };
}

interface BatchItem {
  id: string;
  name: string;
  code: string;
  description?: string;
  _count?: { enrollments: number; classes: number };
  enrollmentStatus?: string;
  enrolledAt?: string | null;
}

interface PendingEnrollment {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
  batch: { id: string; name: string; code: string };
  joinedAt: string;
  status: string;
}

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [availableBatches, setAvailableBatches] = useState<BatchItem[]>([]);
  const [pendingEnrollments, setPendingEnrollments] = useState<PendingEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Class Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [batchId, setBatchId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMins, setDurationMins] = useState(90);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [classRes, batchRes] = await Promise.all([
        apiRequest<{ classes: ClassItem[] }>("/api/classes"),
        apiRequest<{ batches: BatchItem[] }>("/api/batches"),
      ]);
      setClasses(classRes.classes || []);
      setBatches(batchRes.batches || []);
      if (batchRes.batches?.length > 0) {
        setBatchId(batchRes.batches[0].id);
      }

      // For students, fetch available batches with enrollment status
      if (user?.role === "STUDENT") {
        try {
          const availRes = await apiRequest<{ batches: BatchItem[] }>("/api/batches/student");
          setAvailableBatches(availRes.batches || []);
        } catch {
          // Silently fail - student may not have access
        }
      }

      // For teachers/admin, fetch pending batch enrollments
      if (user?.role === "TEACHER" || user?.role === "ADMIN") {
        try {
          const enrollRes = await apiRequest<{ enrollments: PendingEnrollment[] }>(
            "/api/batches/pending"
          );
          setPendingEnrollments(enrollRes.enrollments || []);
        } catch {
          // Silently fail
        }
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest("/api/classes", {
        method: "POST",
        data: {
          title,
          description,
          subject,
          batchId,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMins: Number(durationMins),
        },
      });
      setShowCreateModal(false);
      setTitle("");
      setDescription("");
      fetchData();
    } catch (err: any) {
      alert(err.message || "Failed to create class");
    }
  };

  const liveClasses = classes.filter((c) => c.status === "LIVE");
  const upcomingClasses = classes.filter((c) => c.status === "SCHEDULED");
  const completedClasses = classes.filter((c) => c.status === "COMPLETED");

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 light:shadow-md light:border light:border-slate-200 dark:border dark:border-slate-800/60 dark:shadow-xl dark:shadow-black/20 border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-50 dark:bg-sky-950/30 light:bg-sky-100 border border-sky-200 dark:border-sky-500/30 light:border-sky-300 text-xs font-semibold text-sky-600 dark:text-sky-400 light:text-sky-700">
              <Sparkles className="w-3.5 h-3.5" />
              <span>National Olympiad Training Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              Welcome back, {user?.name}!
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 light:text-slate-600 max-w-2xl">
              {user?.role === "STUDENT"
                ? "Prepare for INPhO, IPhO & JEE Advanced with interactive live problem-solving classrooms and instant Olympiad quizzes."
                : "Manage live classrooms, host real-time Olympiad quizzes, evaluate student distributions, and analyze performance."}
            </p>
          </div>

          {(user?.role === "TEACHER" || user?.role === "ADMIN") && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all text-sm whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Schedule Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Pending Enrollment Approvals (Teacher/Admin) */}
      {(user?.role === "TEACHER" || user?.role === "ADMIN") && pendingEnrollments.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white light:text-slate-800 tracking-tight flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-500 dark:text-amber-400 light:text-amber-600" />
              Pending Enrollment Requests
            </h2>
            <span className="text-xs text-slate-400 light:text-slate-600">
              {pendingEnrollments.length} pending
            </span>
          </div>
          <div className="space-y-2">
            {pendingEnrollments.map((enr) => (
              <div
                key={enr.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950/30 flex items-center justify-center">
                      <Users className="w-4 h-4 text-sky-600 dark:text-sky-400" />
                    </div>
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-white text-sm">
                        {enr.user.name}
                      </span>
                      <span className="text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
                        {enr.user.email}
                      </span>
                    </div>
                    <span className="mx-2 text-slate-300 dark:text-slate-700">|</span>
                    <span className="text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
                      requesting: {enr.batch.name} ({enr.batch.code})
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      try {
                        await apiRequest(
                          `/api/batches/${enr.batch.id}/enrollments/${enr.userId}/APPROVE`,
                          { method: "PUT" }
                        );
                        setPendingEnrollments(
                          pendingEnrollments.filter((e) => e.id !== enr.id)
                        );
                      } catch (err: any) {
                        alert(err.message || "Failed to approve enrollment");
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Approve
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await apiRequest(
                          `/api/batches/${enr.batch.id}/enrollments/${enr.userId}/REJECT`,
                          { method: "PUT" }
                        );
                        setPendingEnrollments(
                          pendingEnrollments.filter((e) => e.id !== enr.id)
                        );
                      } catch (err: any) {
                        alert(err.message || "Failed to reject enrollment");
                      }
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-all flex items-center gap-1"
                  >
                    <XCircle className="w-3 h-3" />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
      {liveClasses.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
              Live Classrooms Happening Now
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveClasses.map((item) => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 dark:hover:border-slate-700/60 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                      ● LIVE NOW
                    </span>
                    <span className="text-xs text-slate-400 light:text-slate-600">
                      {item.batch?.code}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800/60">
                    <div className="text-xs text-slate-500 light:text-slate-600">
                      Teacher: <span className="text-slate-700 dark:text-slate-200 light:text-slate-800 font-medium">{item.teacher?.name}</span>
                    </div>
                    <Link
                      to={`/classroom/${item.id}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-lg transition-all"
                    >
                      <PlayCircle className="w-4 h-4" />
                      Join Live Class
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Classes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white light:text-slate-800 tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-sky-500 dark:text-sky-400 light:text-sky-600" />
            Scheduled Classrooms
          </h2>
          <span className="text-xs text-slate-400 light:text-slate-600">
            {upcomingClasses.length} upcoming
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-400 light:text-slate-600 text-sm">
            <div className="inline-block w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mb-2" />
            Loading classrooms...
          </div>
        ) : upcomingClasses.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-slate-900/50 light:bg-slate-50 border border-slate-200 dark:border-slate-800/60 light:border-slate-200 rounded-2xl text-slate-400 light:text-slate-600 text-sm">
            No scheduled classes upcoming.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {upcomingClasses.map((item) => {
              const dateStr = new Date(item.scheduledAt).toLocaleDateString(
                undefined,
                { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }
              );
              return (
                <div
                  key={item.id}
                  className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:border-slate-300 dark:hover:border-slate-700/60 hover:shadow-md transition-all duration-300"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 light:text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 light:bg-slate-200 text-slate-600 dark:text-slate-300 light:text-slate-700 font-medium">
                        {item.subject}
                      </span>
                      <span className="flex items-center gap-1 text-sky-500 dark:text-sky-400 light:text-sky-600">
                        <Clock className="w-3 h-3" />
                        {item.durationMins}m
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800 dark:text-white text-sm line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 light:text-slate-600 line-clamp-2">
                      {item.description || "Olympiad concept immersion class."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-200 dark:border-slate-800/60 flex items-center justify-between text-xs">
                    <span className="text-sky-500 dark:text-sky-400 font-medium">{dateStr}</span>
                    <Link
                      to={`/classroom/${item.id}`}
                      className="text-xs font-semibold text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Enter Room
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Completed Classes & Recorded Lectures */}
      {completedClasses.length > 0 && (
        <section className="space-y-4">
           <h2 className="text-lg font-bold text-slate-800 dark:text-white light:text-slate-800 tracking-tight flex items-center gap-2">
            <Film className="w-5 h-5 text-indigo-500 dark:text-indigo-400 light:text-indigo-600" />
            Class Recordings & Past Lectures
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {completedClasses.map((item) => (
              <div
                key={item.id}
                className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 hover:shadow-md transition-all duration-300"
              >
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-400 light:text-slate-600">
                    {item.batch?.name}
                  </span>
                  <h3 className="font-semibold text-slate-800 dark:text-white text-sm">
                    {item.title}
                  </h3>
                </div>
                <Link
                  to={`/recordings/${item.id}`}
                  className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-indigo-500 dark:text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 group"
                >
                  <Film className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                  Watch HLS Recording
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Student Course Discovery */}
      {user?.role === "STUDENT" && availableBatches.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white light:text-slate-800 tracking-tight flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-sky-500 dark:text-sky-400 light:text-sky-600" />
              Available Courses & Batches
            </h2>
              <span className="text-xs text-slate-400 light:text-slate-600">
                {availableBatches.filter((b) => b.enrollmentStatus === "ACTIVE" || b.enrollmentStatus === "APPROVED").length} subscribed
              </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableBatches.map((batch) => {
              const isEnrolled = batch.enrollmentStatus === "ACTIVE" || batch.enrollmentStatus === "APPROVED";
              const isPending = batch.enrollmentStatus === "PENDING";
              const isNotEnrolled =
                batch.enrollmentStatus === "NOT_ENROLLED" || !batch.enrollmentStatus;

              let statusBadge = null;
              if (isEnrolled) {
                statusBadge = (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 light:bg-emerald-100 text-emerald-600 dark:text-emerald-400 light:text-emerald-700 border border-emerald-200 dark:border-emerald-500/30 light:border-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {batch.enrollmentStatus === "APPROVED" ? "Approved" : "Enrolled"}
                  </span>
                );
              } else if (isPending) {
                statusBadge = (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Pending Approval
                  </span>
                );
              }

              return (
                <div
                  key={batch.id}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-2xl p-5 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-white text-sm">
                        {batch.name}
                      </h3>
                      <p className="text-xs text-slate-500 light:text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                        {batch.description || "Olympiad training batch."}
                      </p>
                    </div>
                    {statusBadge}
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 light:text-slate-600 dark:text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 light:bg-slate-200 text-slate-600 dark:text-slate-300 light:text-slate-700 font-medium">
                      {batch.code}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {(batch as any).classCount || 0} classes
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {batch._count?.enrollments || 0} students
                    </span>
                  </div>

                  {isNotEnrolled && (
                    <button
                      onClick={async () => {
                        try {
                          await apiRequest(`/api/batches/${batch.id}/enroll`, {
                            method: "POST",
                          });
                          batch.enrollmentStatus = "PENDING";
                          setAvailableBatches([...availableBatches]);
                        } catch (err: any) {
                          alert(err.message || "Failed to enroll");
                        }
                      }}
                      className="mt-4 w-full px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all text-xs flex items-center justify-center gap-1"
                    >
                      <UserPlus className="w-3 h-3" />
                      Request Enrollment (Pending Approval)
                    </button>
                  )}

                  {isPending && (
                    <div className="mt-4 text-center text-xs text-amber-600 dark:text-amber-400">
                      Your enrollment request is awaiting teacher approval.
                    </div>
                  )}

                  {isEnrolled && (
                    <Link
                      to="/"
                      onClick={() => window.location.reload()}
                      className="mt-4 inline-flex items-center justify-center gap-1 w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all text-xs"
                    >
                      <PlayCircle className="w-3 h-3" />
                      Enter Class
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Create Class Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 light:border light:border-slate-200 dark:border dark:border-slate-800 rounded-2xl p-6 shadow-2xl dark:shadow-black/30 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PlusCircle className="w-5 h-5 text-sky-500 dark:text-sky-400 light:text-sky-600" />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white light:text-slate-800">Schedule New Class</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 light:text-slate-600 hover:text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-1 transition-all"
              >
                ⨉
              </button>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
              <div>
                   <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 light:text-slate-600 uppercase tracking-wider mb-1.5">
                     Class Title
                   </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Thermodynamics & Maxwell Relations"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 light:bg-slate-50 border border-slate-300 dark:border-slate-800 light:border-slate-300 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                />
              </div>

              <div>
                   <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 light:text-slate-600 uppercase tracking-wider mb-1.5">
                     Description
                   </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Summary of concepts covered..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 light:bg-slate-50 border border-slate-300 dark:border-slate-800 light:border-slate-300 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 light:text-slate-600 uppercase tracking-wider mb-1.5">
                  Subject
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 light:bg-slate-50 border border-slate-300 dark:border-slate-800 light:border-slate-300 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                >
                  <option value="Physics">Physics</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Chemistry">Chemistry</option>
                  <option value="Biology">Biology</option>
                  <option value="Astronomy">Astronomy</option>
                  <option value="English">English</option>
                </select>
              </div>
                <div>
                   <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 light:text-slate-600 uppercase tracking-wider mb-1.5">
                     Batch
                   </label>
                  <select
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                  >
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 light:text-slate-600 uppercase tracking-wider mb-1.5">
                     Scheduled At
                   </label>
                   <input
                     type="datetime-local"
                     required
                     value={scheduledAt}
                     onChange={(e) => setScheduledAt(e.target.value)}
                     className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 light:bg-slate-50 border border-slate-300 dark:border-slate-800 light:border-slate-300 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                   />
                </div>
                <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-300 light:text-slate-600 uppercase tracking-wider mb-1.5">
                     Duration (Minutes)
                   </label>
                   <input
                     type="number"
                     min={15}
                     max={240}
                     value={durationMins}
                     onChange={(e) => setDurationMins(Number(e.target.value))}
                     className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 light:bg-slate-50 border border-slate-300 dark:border-slate-800 light:border-slate-300 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                   />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 light:bg-slate-100 text-slate-600 dark:text-slate-300 light:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 light:hover:bg-slate-200 rounded-xl font-medium transition-all"
                  >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
                >
                  Create Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

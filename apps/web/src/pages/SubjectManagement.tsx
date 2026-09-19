import React, { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import {
  GraduationCap,
  PlusCircle,
  Edit2,
  Save,
  X,
  Trash2,
  UserCheck,
  Users,
  BookOpen,
} from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";

interface Subject {
  id: string;
  name: string;
  description?: string;
  teacherId: string | null;
  teacher?: { id: string; name: string; email: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

export const SubjectManagement: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    teacherId: "",
  });
  const { theme } = useThemeStore();

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const [subjRes, teachRes] = await Promise.all([
        apiRequest<{ subjects: Subject[] }>("/api/subjects"),
        apiRequest<{ teachers: Teacher[] }>("/api/subjects/teachers"),
      ]);
      setSubjects(subjRes.subjects || []);
      setTeachers(teachRes.teachers || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSubject) {
        await apiRequest(`/api/subjects/${editingSubject.id}`, {
          method: "PATCH",
          data: formData,
        });
      } else {
        await apiRequest("/api/subjects", {
          method: "POST",
          data: formData,
        });
      }
      setShowCreateModal(false);
      setEditingSubject(null);
      setFormData({ name: "", description: "", teacherId: "" });
      fetchSubjects();
    } catch (err: any) {
      alert(err.message || "Failed to save subject");
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      description: subject.description || "",
      teacherId: subject.teacherId || "",
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this subject? This cannot be undone.")) {
      return;
    }
    try {
      await apiRequest(`/api/subjects/${id}`, { method: "DELETE" });
      fetchSubjects();
    } catch (err: any) {
      alert(err.message || "Failed to delete subject");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 light:bg-slate-100 dark:bg-slate-950 text-slate-500 light:text-slate-600 dark:text-slate-400 text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading subjects...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-white light:text-slate-800 tracking-tight flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-sky-500 dark:text-sky-400 light:text-sky-600" />
            Subject & Teacher Management
          </h1>
          <p className="text-sm text-slate-500 light:text-slate-600 dark:text-slate-400 mt-1">
            Create subjects, assign teachers, and manage curriculum areas.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingSubject(null);
            setFormData({ name: "", description: "", teacherId: "" });
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Subject</span>
        </button>
      </div>

      {/* Subjects Table */}
      <div className="bg-white dark:bg-slate-900 light:border light:border-slate-200 dark:border dark:border-slate-800 dark:shadow-xl dark:shadow-black/20 border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white light:text-slate-800 tracking-tight mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-500 dark:text-sky-400 light:text-sky-600" />
            All Subjects ({subjects.length})
          </h2>

          {subjects.length === 0 ? (
            <div className="text-center py-12 text-slate-400 light:text-slate-600 dark:text-slate-400 text-sm">
              <GraduationCap className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No subjects created yet. Add your first subject to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/60 text-slate-500 light:text-slate-600 dark:text-slate-400">
                    <th className="pb-3">Subject Name</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3">Assigned Teacher</th>
                    <th className="pb-3">Created</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {subjects.map((subj) => (
                    <tr
                      key={subj.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 light:hover:bg-slate-50 transition-all"
                    >
                      <td className="py-3 font-semibold text-slate-800 dark:text-white light:text-slate-800">
                        {subj.name}
                      </td>
                      <td className="py-3 text-slate-500 light:text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {subj.description || "—"}
                      </td>
                      <td className="py-3">
                        {subj.teacher ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-sky-100 dark:bg-sky-950/30 flex items-center justify-center">
                              <UserCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                            </div>
                            <span className="text-slate-700 dark:text-slate-300 light:text-slate-800">
                              {subj.teacher.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 light:text-slate-500 dark:text-slate-500 italic">
                            Unassigned
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-slate-500 light:text-slate-600 dark:text-slate-400">
                        {new Date(subj.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEdit(subj)}
                            className="p-1.5 text-slate-500 light:text-slate-600 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Edit subject"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(subj.id)}
                            className="p-1.5 text-slate-500 light:text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Delete subject"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Available Teachers */}
      <div className={`bg-white dark:bg-slate-900 light:border light:border-slate-200 dark:border dark:border-slate-800 dark:shadow-xl dark:shadow-black/20 border border-slate-200 rounded-2xl shadow-sm p-6`}>
        <h2 className={`text-lg font-bold text-slate-800 dark:text-white light:text-slate-800 tracking-tight mb-4 flex items-center gap-2`}>
          <UserCheck className="w-5 h-5 text-emerald-500 dark:text-emerald-400 light:text-emerald-600" />
          Available Teachers ({teachers.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {teachers.map((teacher) => (
            <div
              key={teacher.id}
              className={`flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 light:bg-slate-50 border border-slate-200 dark:border-slate-700 light:border-slate-200`}
            >
              <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-950/30 flex items-center justify-center">
                <UserCheck className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <span className="font-medium text-slate-800 dark:text-white light:text-slate-800 text-sm">
                  {teacher.name}
                </span>
                <span className="text-xs text-slate-500 light:text-slate-600 dark:text-slate-400 block">
                  {teacher.email}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 light:border light:border-slate-200 dark:border dark:border-slate-800 rounded-2xl p-6 shadow-2xl dark:shadow-black/30 space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className={`w-5 h-5 text-sky-500 dark:text-sky-400 light:text-sky-600`} />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white light:text-slate-800">
                  {editingSubject ? "Edit Subject" : "Add New Subject"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingSubject(null);
                  setFormData({ name: "", description: "", teacherId: "" });
                }}
                className={`text-slate-400 light:text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-1 transition-all`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-500 light:text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Physics, Chemistry, Mathematics..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 light:bg-slate-50 border border-slate-300 dark:border-slate-800 light:border-slate-300 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 light:text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the subject..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 light:bg-slate-50 border border-slate-300 dark:border-slate-800 light:border-slate-300 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 light:text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Assign Teacher
                </label>
                <select
                  value={formData.teacherId}
                  onChange={(e) =>
                    setFormData({ ...formData, teacherId: e.target.value })
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 light:bg-slate-50 border border-slate-300 dark:border-slate-800 light:border-slate-300 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                >
                  <option value="">Unassigned (no teacher)</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingSubject(null);
                    setFormData({ name: "", description: "", teacherId: "" });
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 light:bg-slate-100 text-slate-600 dark:text-slate-300 light:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  {editingSubject ? "Update Subject" : "Create Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import {
  Layers,
  PlusCircle,
  Edit2,
  Save,
  X,
  Trash2,
  Users,
  BookOpen,
  Hash,
} from "lucide-react";
import { useThemeStore } from "../store/useThemeStore";

interface Batch {
  id: string;
  name: string;
  description?: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  _count?: { enrollments: number; classes: number };
}

export const BatchManagement: React.FC = () => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    code: "",
  });
  const { theme } = useThemeStore();

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await apiRequest<{ batches: Batch[] }>("/api/batches");
      setBatches(res.batches || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBatch) {
        await apiRequest(`/api/batches/${editingBatch.id}`, {
          method: "PATCH",
          data: formData,
        });
      } else {
        await apiRequest("/api/batches", {
          method: "POST",
          data: formData,
        });
      }
      setShowCreateModal(false);
      setEditingBatch(null);
      setFormData({ name: "", description: "", code: "" });
      fetchBatches();
    } catch (err: any) {
      alert(err.message || "Failed to save batch");
    }
  };

  const handleEdit = (batch: Batch) => {
    setEditingBatch(batch);
    setFormData({
      name: batch.name,
      description: batch.description || "",
      code: batch.code,
    });
    setShowCreateModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this batch? This will also delete all classes within it and cannot be undone.")) {
      return;
    }
    try {
      await apiRequest(`/api/batches/${id}`, { method: "DELETE" });
      fetchBatches();
    } catch (err: any) {
      alert(err.message || "Failed to delete batch");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 light:bg-slate-100 dark:bg-slate-950 text-slate-500 light:text-slate-600 dark:text-slate-400 text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading batches...</span>
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
            <Layers className="w-7 h-7 text-sky-500 dark:text-sky-400 light:text-sky-600" />
            Batch Management
          </h1>
          <p className="text-sm text-slate-500 light:text-slate-600 dark:text-slate-400 mt-1">
            Create, edit, and manage batches. Batches are containers for classes and student enrollments.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingBatch(null);
            setFormData({ name: "", description: "", code: "" });
            setShowCreateModal(true);
          }}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Add Batch</span>
        </button>
      </div>

      {/* Batches Table */}
      <div className="bg-white dark:bg-slate-900 light:border light:border-slate-200 dark:border dark:border-slate-800 dark:shadow-xl dark:shadow-black/20 border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white light:text-slate-800 tracking-tight mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-500 dark:text-sky-400 light:text-sky-600" />
            All Batches ({batches.length})
          </h2>

          {batches.length === 0 ? (
            <div className="text-center py-12 text-slate-400 light:text-slate-600 dark:text-slate-400 text-sm">
              <Layers className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No batches created yet. Add your first batch to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/60 text-slate-500 light:text-slate-600 dark:text-slate-400">
                    <th className="pb-3">Batch Name</th>
                    <th className="pb-3">Code</th>
                    <th className="pb-3">Description</th>
                    <th className="pb-3 flex items-center gap-1"><BookOpen className="w-4 h-4" />Classes</th>
                    <th className="pb-3 flex items-center gap-1"><Users className="w-4 h-4" />Enrollments</th>
                    <th className="pb-3">Created</th>
                    <th className="pb-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
                  {batches.map((batch) => (
                    <tr
                      key={batch.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 light:hover:bg-slate-50 transition-all"
                    >
                      <td className="py-3 font-semibold text-slate-800 dark:text-white light:text-slate-800">
                        {batch.name}
                      </td>
                      <td className="py-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 light:bg-slate-200 text-slate-600 dark:text-slate-300 light:text-slate-700 font-medium flex items-center gap-1">
                          <Hash className="w-3 h-3" />
                          {batch.code}
                        </span>
                      </td>
                      <td className="py-3 text-slate-500 light:text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {batch.description || "—"}
                      </td>
                      <td className="py-3 text-slate-700 dark:text-slate-300 light:text-slate-800">
                        {batch._count?.classes ?? 0}
                      </td>
                      <td className="py-3 text-slate-700 dark:text-slate-300 light:text-slate-800">
                        {batch._count?.enrollments ?? 0}
                      </td>
                      <td className="py-3 text-slate-500 light:text-slate-600 dark:text-slate-400">
                        {new Date(batch.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={() => handleEdit(batch)}
                            className="p-1.5 text-slate-500 light:text-slate-600 dark:text-slate-400 hover:text-sky-500 dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Edit batch"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(batch.id)}
                            className="p-1.5 text-slate-500 light:text-slate-600 dark:text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                            title="Delete batch"
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

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className={`w-full max-w-md bg-white dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-950 light:border light:border-slate-200 dark:border dark:border-slate-800 rounded-2xl p-6 shadow-2xl dark:shadow-black/30 space-y-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className={`w-5 h-5 text-sky-500 dark:text-sky-400 light:text-sky-600`} />
                <h3 className="text-lg font-bold text-slate-800 dark:text-white light:text-slate-800">
                  {editingBatch ? "Edit Batch" : "Add New Batch"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setEditingBatch(null);
                  setFormData({ name: "", description: "", code: "" });
                }}
                className={`text-slate-400 light:text-slate-600 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg p-1 transition-all`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-500 light:text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Batch Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Physics Olympiad Batch 2026"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 light:bg-slate-50 border border-slate-300 dark:border-slate-800 light:border-slate-300 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 light:text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Batch Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g. PHY-OLY-2026"
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 light:bg-slate-50 border border-slate-300 dark:border-slate-800 light:border-slate-300 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                />
                <p className="mt-1 text-xs text-slate-400 light:text-slate-500 dark:text-slate-400">
                  Unique code students use to identify this batch.
                </p>
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
                  placeholder="Brief description of this batch..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 light:bg-slate-50 border border-slate-300 dark:border-slate-800 light:border-slate-300 rounded-xl text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setEditingBatch(null);
                    setFormData({ name: "", description: "", code: "" });
                  }}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800/50 light:bg-slate-100 text-slate-600 dark:text-slate-300 light:text-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 light:hover:bg-slate-200 rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-1"
                >
                  <Save className="w-3 h-3" />
                  {editingBatch ? "Update Batch" : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

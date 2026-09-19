import React, { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { Award, Plus, Check, Trash2 } from "lucide-react";

export const QuizBuilder: React.FC = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [batchId, setBatchId] = useState("");
  const [isLiveOnly, setIsLiveOnly] = useState(true);
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [qRes, bRes] = await Promise.all([
          apiRequest<{ questions: any[] }>("/api/questions"),
          apiRequest<{ batches: any[] }>("/api/batches"),
        ]);
        setQuestions(qRes.questions || []);
        setBatches(bRes.batches || []);
        if (bRes.batches?.length > 0) setBatchId(bRes.batches[0].id);
      } catch (err) {
        console.error("Quiz builder fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const toggleQuestion = (id: string) => {
    setSelectedQuestionIds((prev) =>
      prev.includes(id) ? prev.filter((qId) => qId !== id) : [...prev, id]
    );
  };

  const handleCreateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestionIds.length === 0) {
      alert("Please select at least 1 question for the quiz");
      return;
    }

    try {
      await apiRequest("/api/quizzes", {
        method: "POST",
        data: {
          title,
          description,
          batchId: batchId || undefined,
          isLiveOnly,
          dueDate: !isLiveOnly && dueDate ? new Date(dueDate).toISOString() : undefined,
          questionIds: selectedQuestionIds,
        },
      });

      alert("Quiz created successfully!");
      setTitle("");
      setDescription("");
      setSelectedQuestionIds([]);
    } catch (err: any) {
      alert(err.message || "Failed to create quiz");
    }
  };

  const selectedQuestionsList = selectedQuestionIds
    .map((id) => questions.find((q) => q.id === id))
    .filter(Boolean);

  const totalSelectedMarks = selectedQuestionsList.reduce(
    (acc, q) => acc + Number(q.marks),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Olympiad Quiz Builder
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Assemble ordered Olympiad competition quizzes to deploy live during class or assign as homework.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Question Bank Selector */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Select Questions ({selectedQuestionIds.length} Selected)
            </span>
            <span className="text-xs text-sky-400 font-semibold">
              Total Marks: {totalSelectedMarks}
            </span>
          </div>

          <div className="space-y-3 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-8 text-slate-500 text-xs">Loading questions...</div>
            ) : (
              questions.map((q) => {
                const isSelected = selectedQuestionIds.includes(q.id);
                return (
                  <div
                    key={q.id}
                    onClick={() => toggleQuestion(q.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? "bg-sky-950/40 border-sky-500 shadow-lg shadow-sky-500/10"
                        : "bg-slate-900 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                            isSelected
                              ? "bg-sky-600 border-sky-500 text-white"
                              : "border-slate-700 bg-slate-950"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <span className="font-semibold text-slate-200">{q.topic}</span>
                        <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-400">
                          {q.difficulty}
                        </span>
                      </div>
                      <span className="text-slate-400 text-xs">
                        +{q.marks} pts ({q.timeLimitSeconds}s)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">{q.stem}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Col: Quiz Settings & Review */}
        <div className="space-y-4">
          <form
            onSubmit={handleCreateQuiz}
            className="p-5 bg-slate-900 border border-slate-800 rounded-2xl space-y-4 text-xs shadow-xl"
          >
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Quiz Details
            </h3>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Quiz Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. INPhO Mechanics Screening Quiz"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Description</label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Instructions, syllabus coverage..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Assign to Batch</label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              >
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="liveOnly"
                checked={isLiveOnly}
                onChange={(e) => setIsLiveOnly(e.target.checked)}
                className="rounded border-slate-700"
              />
              <label htmlFor="liveOnly" className="text-slate-300 cursor-pointer">
                Live Class Quiz (Launched by teacher)
              </label>
            </div>

            {!isLiveOnly && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Due Date</label>
                <input
                  type="datetime-local"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>
            )}

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Selected Questions:</span>
                <span className="font-semibold text-white">{selectedQuestionIds.length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Score:</span>
                <span className="font-semibold text-sky-400">{totalSelectedMarks} pts</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={selectedQuestionIds.length === 0}
              className="w-full py-2.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-xl shadow-sky-600/30 disabled:opacity-40 transition-all duration-200"
            >
              Publish Quiz
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

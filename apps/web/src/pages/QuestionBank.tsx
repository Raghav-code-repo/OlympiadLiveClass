import React, { useEffect, useState } from "react";
import { apiRequest } from "../lib/api";
import { PlusCircle, Search, Trash2, HelpCircle, CheckCircle } from "lucide-react";

interface QuestionItem {
  id: string;
  stem: string;
  type: string;
  options: Array<{ id: string; text: string }>;
  correctAnswer: string;
  explanation?: string;
  difficulty: string;
  subject: string;
  topic: string;
  marks: number;
  negativeMarks: number;
  timeLimitSeconds: number;
}

export const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [subjectFilter, setSubjectFilter] = useState("");
  const [difficultyFilter, setDifficultyFilter] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // New Question Form
  const [stem, setStem] = useState("");
  const [type, setType] = useState("MCQ_SINGLE");
  const [subject, setSubject] = useState("Physics");
  const [topic, setTopic] = useState("Rotational Dynamics");
  const [difficulty, setDifficulty] = useState("MEDIUM");
  const [marks, setMarks] = useState(4);
  const [negativeMarks, setNegativeMarks] = useState(1);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState(60);
  const [correctAnswer, setCorrectAnswer] = useState("A");
  const [explanation, setExplanation] = useState("");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      let query = "";
      if (subjectFilter) query += `subject=${encodeURIComponent(subjectFilter)}&`;
      if (difficultyFilter) query += `difficulty=${encodeURIComponent(difficultyFilter)}&`;
      const res = await apiRequest<{ questions: QuestionItem[] }>(
        `/api/questions?${query}`
      );
      setQuestions(res.questions || []);
    } catch (err) {
      console.error("Fetch questions failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [subjectFilter, difficultyFilter]);

  const handleCreateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let options: Array<{ id: string; text: string }> = [];
      if (type === "MCQ_SINGLE" || type === "MCQ_MULTI") {
        options = [
          { id: "A", text: optA },
          { id: "B", text: optB },
          { id: "C", text: optC },
          { id: "D", text: optD },
        ].filter((o) => o.text.trim());
      } else if (type === "TRUE_FALSE") {
        options = [
          { id: "true", text: "True" },
          { id: "false", text: "False" },
        ];
      }

      await apiRequest("/api/questions", {
        method: "POST",
        data: {
          stem,
          type,
          subject,
          topic,
          difficulty,
          marks: Number(marks),
          negativeMarks: Number(negativeMarks),
          timeLimitSeconds: Number(timeLimitSeconds),
          correctAnswer,
          explanation,
          options,
        },
      });

      setShowAddModal(false);
      setStem("");
      setOptA("");
      setOptB("");
      setOptC("");
      setOptD("");
      setExplanation("");
      fetchQuestions();
    } catch (err: any) {
      alert(err.message || "Failed to create question");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;
    try {
      await apiRequest(`/api/questions/${id}`, { method: "DELETE" });
      fetchQuestions();
    } catch (err: any) {
      alert(err.message || "Failed to delete question");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Olympiad Question Bank
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, manage, and craft challenging physics and math olympiad problems.
          </p>
        </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-sky-600 via-indigo-600 to-purple-600 hover:from-sky-500 hover:via-indigo-500 hover:to-purple-500 text-white rounded-xl text-xs font-semibold shadow-xl shadow-sky-600/30 transition-all duration-200"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Add Olympiad Question</span>
          </button>
      </div>

      {/* Filter Bar */}
        <div className="p-4 bg-gradient-to-br from-slate-900/80 to-slate-950/60 border border-slate-800/50 rounded-2xl flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by subject..."
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="w-full bg-transparent border-none text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-0"
            />
          </div>

          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800/60 rounded-lg px-3 py-1.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs transition-all"
          >
          <option value="">All Difficulties</option>
          <option value="EASY">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HARD">Hard</option>
          <option value="OLYMPIAD">Olympiad</option>
        </select>
      </div>

      {/* Question List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-500 text-sm">
            Loading question bank...
          </div>
        ) : questions.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/50 border border-slate-800 rounded-2xl text-slate-400 text-sm">
            No questions found matching criteria.
          </div>
        ) : (
          questions.map((q, idx) => (
              <div
                key={q.id}
                className="p-5 bg-gradient-to-br from-slate-900/60 to-slate-950/40 border border-slate-800/50 rounded-2xl hover:border-slate-700/60 hover:shadow-xl transition-all duration-300 space-y-3"
              >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sky-400">#{idx + 1}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {q.topic}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                    {q.difficulty}
                  </span>
                  <span className="text-slate-400">{q.type}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400">
                    +{q.marks} / -{q.negativeMarks} ({q.timeLimitSeconds}s)
                  </span>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="text-slate-500 hover:text-rose-400"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-100 font-medium leading-relaxed">
                {q.stem}
              </p>

              {q.options.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  {q.options.map((opt) => (
                    <div
                      key={opt.id}
                      className={`px-3 py-2 rounded-xl text-xs border ${
                        opt.id === q.correctAnswer ||
                        q.correctAnswer.includes(opt.id)
                          ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300 font-semibold"
                          : "bg-slate-950 border-slate-800 text-slate-300"
                      }`}
                    >
                      <strong className="mr-1.5">{opt.id}.</strong> {opt.text}
                    </div>
                  ))}
                </div>
              )}

              {q.explanation && (
                <div className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                  <span className="font-semibold text-sky-400">Explanation: </span>
                  {q.explanation}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Question Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Olympiad Problem</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateQuestion} className="space-y-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Problem Stem (Rich Text)
                </label>
                <textarea
                  rows={3}
                  required
                  value={stem}
                  onChange={(e) => setStem(e.target.value)}
                  placeholder="Enter problem formulation, equations, parameters..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="MCQ_SINGLE">MCQ (Single Correct)</option>
                    <option value="MCQ_MULTI">MCQ (Multi Correct)</option>
                    <option value="NUMERIC">Numeric Answer</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                    <option value="OLYMPIAD">Olympiad</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Topic</label>
                  <input
                    type="text"
                    required
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              {(type === "MCQ_SINGLE" || type === "MCQ_MULTI") && (
                <div className="space-y-2">
                  <label className="block text-slate-300 font-semibold">Options</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Option A"
                      value={optA}
                      onChange={(e) => setOptA(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                    <input
                      type="text"
                      placeholder="Option B"
                      value={optB}
                      onChange={(e) => setOptB(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                    <input
                      type="text"
                      placeholder="Option C"
                      value={optC}
                      onChange={(e) => setOptC(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                    <input
                      type="text"
                      placeholder="Option D"
                      value={optD}
                      onChange={(e) => setOptD(e.target.value)}
                      className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Correct Answer
                  </label>
                  <input
                    type="text"
                    required
                    value={correctAnswer}
                    onChange={(e) => setCorrectAnswer(e.target.value)}
                    placeholder="e.g. A, [A,C], or 45.0"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Marks (+) / Neg (-)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={marks}
                      onChange={(e) => setMarks(Number(e.target.value))}
                      className="w-1/2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                    <input
                      type="number"
                      value={negativeMarks}
                      onChange={(e) => setNegativeMarks(Number(e.target.value))}
                      className="w-1/2 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Time Limit (sec)
                  </label>
                  <input
                    type="number"
                    value={timeLimitSeconds}
                    onChange={(e) => setTimeLimitSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Step-by-Step Explanation
                </label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Solution steps, physical principles applied..."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl font-semibold shadow-lg shadow-sky-600/20"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

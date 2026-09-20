import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";
import { Dashboard } from "./pages/Dashboard";
import { LiveClassroom } from "./pages/LiveClassroom";
import { QuestionBank } from "./pages/QuestionBank";
import { QuizBuilder } from "./pages/QuizBuilder";
import { RecordingPlayback } from "./pages/RecordingPlayback";
import { Analytics } from "./pages/Analytics";
import { SubjectManagement } from "./pages/SubjectManagement";
import { BatchManagement } from "./pages/BatchManagement";

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Navbar />
                <main className="flex-1">
                  <Dashboard />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/classroom/:id"
            element={
              <ProtectedRoute>
                <Navbar />
                <LiveClassroom />
              </ProtectedRoute>
            }
          />

          <Route
            path="/questions"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "TEACHER"]}>
                <Navbar />
                <main className="flex-1">
                  <QuestionBank />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/quiz-builder"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "TEACHER"]}>
                <Navbar />
                <main className="flex-1">
                  <QuizBuilder />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/recordings/:classId"
            element={
              <ProtectedRoute>
                <Navbar />
                <main className="flex-1">
                  <RecordingPlayback />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <Navbar />
                <main className="flex-1">
                  <Analytics />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/subjects"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <Navbar />
                <main className="flex-1">
                  <SubjectManagement />
                </main>
              </ProtectedRoute>
            }
          />

          <Route
            path="/batches"
            element={
              <ProtectedRoute allowedRoles={["ADMIN"]}>
                <Navbar />
                <main className="flex-1">
                  <BatchManagement />
                </main>
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
};

export default App;

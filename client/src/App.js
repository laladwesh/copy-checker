import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { getUser, clearToken } from './utils/auth';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginSuccess from './routes/LoginSuccess';
import AdminPanel from './routes/AdminPanel';
import ExaminerPanel from './routes/ExaminerPanel';
import StudentPanel from './routes/StudentPanel';
import CopyChecker from './routes/CopyChecker';
import ExaminerQueries from './routes/ExaminerQueries'; // NEW: Import ExaminerQueries

export default function App() {
  const user = getUser();

  const handleLogout = () => {
    clearToken();
    // force a full reload to reset auth state
    window.location.href = '/auth/success';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className="flex-1 container mx-auto p-4">
        <Routes>
          <Route
            path="/"
            element={
              user
                ? <Navigate to={`/${user.role}`} replace />
                : <Navigate to="/auth/success" replace />
            }
          />

          <Route path="/auth/success" element={<LoginSuccess />} />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute user={user} role="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />

          {/* Examiner Routes */}
          {/* Note: The order of examiner routes matters. More specific paths first. */}
          <Route
            path="/examiner/check/:copyId"
            element={
              <ProtectedRoute user={user} role="examiner">
                <CopyChecker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/examiner/queries" // NEW: Route for ExaminerQueries
            element={
              <ProtectedRoute user={user} role="examiner">
                <ExaminerQueries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/examiner/*" // This should be the last examiner route to catch general paths
            element={
              <ProtectedRoute user={user} role="examiner">
                <ExaminerPanel />
              </ProtectedRoute>
            }
          />

          <Route
            path="/student/*"
            element={
              <ProtectedRoute user={user} role="student">
                <StudentPanel />
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              <div className="text-center mt-20 text-gray-500">
                404 — Page not found
              </div>
            }
          />
        </Routes>
      </main>
    </div>
  );
}
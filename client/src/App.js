import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getUser, clearToken } from './utils/auth';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginSuccess from './routes/LoginSuccess';
import AdminPanel from './routes/AdminPanel';
import AdminExaminers from './routes/AdminExaminers';
import AdminExaminerDetails from './routes/AdminExaminerDetails';
import ExaminerPanel from './routes/ExaminerPanel';
import StudentPanel from './routes/StudentPanel';
import CopyChecker from './routes/CopyChecker';
import ExaminerQueries from './routes/ExaminerQueries';
import StudentCopyViewer from './components/StudentCopyViewer';
import ExaminerQueryViewer from './components/ExaminerQueryViewer';
import { setToken }      from './utils/auth';
import AdminExamDetails from './components/AdminExamDetails';
import AdminCopyViewer from './components/AdminCopyViewer';
import ExaminerCopyViewer from './components/ExaminerCopyViewer';
import AdminManageQueries from './routes/AdminManageQueries';
import ManageUsers from './routes/ManageUsers';
import ExaminerInstructions from './routes/ExaminerInstructions';
import ExaminerHowTo from './routes/ExaminerHowTo';
import TermsAndConditions from './routes/TermsAndConditions';
import PrivacyPolicy from './routes/PrivacyPolicy';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const user = getUser();
  const location = useLocation();

  // run once every time the URL changes:
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token  = params.get('token');
    if (token) {
      setToken(token);

      // drop ?token=… so it’s not visible anymore
      const cleanPath = location.pathname + location.hash;
      window.history.replaceState({}, '', cleanPath);
    }
  }, [location]);

  const handleLogout = () => {
    clearToken();
    // force a full reload to reset auth state
    window.location.href = '/auth/success';
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar user={user} onLogout={handleLogout} />

      <main className=" p-4">
        <Toaster position="top-center" reverseOrder={false} />
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

          {/* Public Routes - Terms and Privacy */}
          <Route path="/terms" element={<TermsAndConditions />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />

          {/* Admin Routes - More specific routes first */}
          <Route
            path="/admin/exams/:examId" // NEW: Route for AdminExamDetails
            element={
              <ProtectedRoute user={user} role="admin">
                <AdminExamDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/copies/view/:copyId" // NEW: Route for AdminCopyViewer
            element={
              <ProtectedRoute user={user} role="admin">
                <AdminCopyViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/examiners"
            element={
              <ProtectedRoute user={user} role="admin">
                <AdminExaminers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/examiners/:examinerId"
            element={
              <ProtectedRoute user={user} role="admin">
                <AdminExaminerDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/queries"
            element={
              <ProtectedRoute user={user} role="admin">
                <AdminManageQueries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute user={user} role="admin">
                <ManageUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/*" // General admin panel route (catch-all for admin)
            element={
              <ProtectedRoute user={user} role="admin">
                <AdminPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/examiner/copies/view/:copyId" // NEW: Route for AdminCopyViewer
            element={
              <ProtectedRoute user={user} role="examiner">
                <ExaminerCopyViewer />
              </ProtectedRoute>
            }
          />

          {/* Examiner Routes - More specific routes first */}
          <Route
            path="/examiner/instructions"
            element={
              // <ProtectedRoute user={user} role="examiner">
              //   <ExaminerInstructions />
              // </ProtectedRoute>
              <ExaminerInstructions />
            }
          />
          <Route
            path="/how-to-examiner"
            element={<ExaminerHowTo />}
          />
          <Route
            path="/examiner/check/:copyId"
            element={
              <ProtectedRoute user={user} role="examiner">
                <CopyChecker />
              </ProtectedRoute>
            }
          />
          <Route
            path="/examiner/queries/view/:queryId"
            element={
              <ProtectedRoute user={user} role="examiner">
                <ExaminerQueryViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/examiner/queries"
            element={
              <ProtectedRoute user={user} role="examiner">
                <ExaminerQueries />
              </ProtectedRoute>
            }
          />
          <Route
            path="/examiner/*" // General examiner dashboard route (catch-all for examiner)
            element={
              <ProtectedRoute user={user} role="examiner">
                <ExaminerPanel />
              </ProtectedRoute>
            }
          />

          {/* Student Routes */}
          <Route
            path="/student/copy/:copyId"
            element={
              <ProtectedRoute user={user} role="student">
                <StudentCopyViewer />
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

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ErrorBoundary from './components/feedback/ErrorBoundary';
import AppShell from './components/layout/AppShell';
import LoadingState from './components/feedback/LoadingState';

// Pages
import LoginPage from './pages/auth/LoginPage';
import HomePage from './pages/HomePage';
import DashboardPage from './pages/DashboardPage';
import ConceptsPage from './pages/ConceptsPage';
import QuizPage from './pages/QuizPage';
import CodeAssessmentsPage from './pages/CodeAssessmentsPage';
import ProgressPage from './pages/ProgressPage';
import ProfilePage from './pages/ProfilePage';
import TeacherContentUploadPage from './pages/TeacherContentUploadPage';
import TeacherStudentProgressPage from './pages/TeacherStudentProgressPage';
import SessionReplayPage from './pages/SessionReplayPage';

import './App.css';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState message="Verifying session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingState message="Verifying session..." />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/home" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public Login & Sign Up */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        }
      />

      {/* Authenticated Application Shell */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/home" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* Student Content Nested Routes */}
        <Route path="/content" element={<Navigate to="/content/concepts" replace />} />
        <Route path="/content/concepts" element={<ConceptsPage />} />
        <Route path="/content/quizzes" element={<QuizPage />} />
        <Route path="/content/coding" element={<CodeAssessmentsPage />} />

        {/* Backward Compatibility & Convenience Route Aliases */}
        <Route path="/quiz" element={<QuizPage />} />
        <Route path="/quizzes" element={<Navigate to="/content/quizzes" replace />} />
        <Route path="/code-assessments" element={<CodeAssessmentsPage />} />
        <Route path="/coding" element={<Navigate to="/content/coding" replace />} />
        <Route path="/concepts" element={<Navigate to="/content/concepts" replace />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        {/* Teacher Specific Routes & Aliases */}
        <Route path="/teacher/content-upload" element={<TeacherContentUploadPage />} />
        <Route path="/teacher/upload" element={<Navigate to="/teacher/content-upload" replace />} />
        <Route path="/teacher/dashboard" element={<Navigate to="/dashboard" replace />} />
        <Route path="/teacher/cohort" element={<Navigate to="/dashboard" replace />} />
        <Route path="/teacher/roster" element={<Navigate to="/dashboard" replace />} />
        <Route path="/teacher/student-progress" element={<TeacherStudentProgressPage />} />
        <Route path="/teacher/analytics" element={<Navigate to="/teacher/student-progress" replace />} />
        <Route path="/teacher/replay/:sessionId" element={<SessionReplayPage />} />
      </Route>

      {/* Fallback & Root Redirects */}
      <Route path="/" element={<Navigate to="/home" replace />} />
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

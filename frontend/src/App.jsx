import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { SensoryProvider } from './context/SensoryContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MedicalOnboardingPage from './pages/MedicalOnboardingPage';
import OnboardingPage from './pages/OnboardingPage';
import LearnerHomePage from './pages/LearnerHomePage';
import SessionPage from './pages/SessionPage';
import ProgressPage from './pages/ProgressPage';
import SettingsPage from './pages/SettingsPage';
import CaregiverDashboardPage from './pages/CaregiverDashboardPage';
import StudentRegistrationPage from './pages/StudentRegistrationPage';
import StudentScreeningPage from './pages/StudentScreeningPage';
import StudentProfileResultPage from './pages/StudentProfileResultPage';
import SkillForgeCalibrationPage from './pages/SkillForgeCalibrationPage';
import SkillForgeMasteryPage from './pages/SkillForgeMasteryPage';

// Dashboards and Games
import GamesContainer from './games/Games';
import { LearnerDashboard, CaregiverDashboard, EducatorDashboard } from './components/dashboards/Dashboards';
import ErrorBoundary from './components/common/ErrorBoundary';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const OnboardingCheckRoute = ({ children }) => {
  const { user, hasCompletedOnboarding, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasCompletedOnboarding) return <Navigate to="/onboarding" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      
      {/* Registration / Medical / Caregiver Profile & Settings */}
      <Route path="/medical-onboarding" element={
        <ProtectedRoute>
          <MedicalOnboardingPage />
        </ProtectedRoute>
      } />
      
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />

      {/* Learner Pages */}
      <Route
        path="/home"
        element={
          <OnboardingCheckRoute>
            <LearnerHomePage />
          </OnboardingCheckRoute>
        }
      />

      <Route
        path="/session"
        element={
          <OnboardingCheckRoute>
            <SessionPage />
          </OnboardingCheckRoute>
        }
      />

      <Route
        path="/progress"
        element={
          <OnboardingCheckRoute>
            <ProgressPage />
          </OnboardingCheckRoute>
        }
      />

      {/* SkillForge Calibration: 3-Minute Adaptive Diagnostic */}
      <Route
        path="/calibration"
        element={
          <ProtectedRoute>
            <SkillForgeCalibrationPage />
          </ProtectedRoute>
        }
      />

      {/* SkillForge Mastery Game & Dynamic Skill Map */}
      <Route
        path="/mastery"
        element={
          <ProtectedRoute>
            <SkillForgeMasteryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/skill-map"
        element={
          <ProtectedRoute>
            <SkillForgeMasteryPage />
          </ProtectedRoute>
        }
      />

      {/* Phase 2 Caregiver Insights Dashboard */}
      <Route
        path="/caregiver"
        element={
          <ProtectedRoute>
            <CaregiverDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Student Onboarding & Baseline Screening Flow (Caretaker -> Student Experience) */}
      <Route
        path="/student-registration"
        element={
          <ProtectedRoute>
            <StudentRegistrationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student-screening/:studentId"
        element={
          <ProtectedRoute>
            <StudentScreeningPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/student-profile/:studentId"
        element={
          <ProtectedRoute>
            <StudentProfileResultPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/students"
        element={<Navigate to="/caregiver" replace />}
      />

      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      {/* Gamification & Dashboards */}
      <Route path="/games" element={
        <ProtectedRoute>
          <GamesContainer />
        </ProtectedRoute>
      } />
      <Route path="/dashboard" element={<Navigate to="/caregiver" replace />} />
      <Route
        path="/dashboard/learner"
        element={
          <ProtectedRoute>
            <LearnerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/caregiver"
        element={
          <ProtectedRoute>
            <CaregiverDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard/educator"
        element={
          <ProtectedRoute>
            <EducatorDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <ErrorBoundary>
        <AuthProvider>
          <ThemeProvider>
            <SensoryProvider>
              <AppRoutes />
            </SensoryProvider>
          </ThemeProvider>
        </AuthProvider>
      </ErrorBoundary>
    </Router>
  );
}

export default App;

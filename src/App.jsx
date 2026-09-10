import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Parent from './pages/Parent.jsx'
import Quiz from './pages/Quiz.jsx'
import QuizSelect from './pages/QuizSelect.jsx'
import TutorChat from './pages/TutorChat.jsx'
import Activity from './pages/Activity.jsx'
import RedemptionHistory from './pages/RedemptionHistory.jsx'
import TutorSessions from './pages/TutorSessions.jsx'
import Assessment from './pages/Assessment.jsx'

export default function App() {
  return (
    <AuthProvider>
      <div className="app-shell">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent"
            element={
              <ProtectedRoute requireRole="parent">
                <Parent />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quiz/:topicId"
            element={
              <ProtectedRoute>
                <Quiz />
              </ProtectedRoute>
            }
          />
          <Route
            path="/quizzes"
            element={
              <ProtectedRoute>
                <QuizSelect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tutor"
            element={
              <ProtectedRoute>
                <TutorChat />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity"
            element={
              <ProtectedRoute>
                <Activity />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/redemptions"
            element={
              <ProtectedRoute requireRole="parent">
                <RedemptionHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/tutor-sessions"
            element={
              <ProtectedRoute requireRole="parent">
                <TutorSessions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/parent/assessment"
            element={
              <ProtectedRoute requireRole="parent">
                <Assessment />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  )
}

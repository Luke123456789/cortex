import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AppShell from './components/shell/AppShell.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Parent from './pages/Parent.jsx'
import Quiz from './pages/Quiz.jsx'
import QuizSelect from './pages/QuizSelect.jsx'
import TutorChat from './pages/TutorChat.jsx'
import Activity from './pages/Activity.jsx'
import RedemptionHistory from './pages/RedemptionHistory.jsx'
import TutorSessions from './pages/TutorSessions.jsx'
import Analytics from './pages/Analytics.jsx'
import AssignWork from './pages/AssignWork.jsx'
import WorkHistory from './pages/WorkHistory.jsx'
import Assignments from './pages/Assignments.jsx'
import PlayQuiz from './pages/PlayQuiz.jsx'
import WrittenTest from './pages/WrittenTest.jsx'
import SubjectLocksPage from './pages/SubjectLocksPage.jsx'

const parentOnly = (element) => <ProtectedRoute requireRole="parent">{element}</ProtectedRoute>

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        {/* Every signed-in page renders inside the app shell. */}
        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/quizzes" element={<QuizSelect />} />
          <Route path="/quiz/:topicId" element={<Quiz />} />
          <Route path="/play/:quizId" element={<PlayQuiz />} />
          <Route path="/written/:questionId" element={<WrittenTest />} />
          <Route path="/tutor" element={<TutorChat />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/activity" element={<Activity />} />

          <Route path="/parent" element={parentOnly(<Parent />)} />
          <Route path="/parent/assign" element={parentOnly(<AssignWork />)} />
          <Route path="/parent/history" element={parentOnly(<WorkHistory />)} />
          <Route path="/parent/locks" element={parentOnly(<SubjectLocksPage />)} />
          <Route path="/parent/redemptions" element={parentOnly(<RedemptionHistory />)} />
          <Route path="/parent/tutor-sessions" element={parentOnly(<TutorSessions />)} />
          <Route path="/parent/analytics" element={parentOnly(<Analytics />)} />
          {/* Old address (the page was called Assessment). */}
          <Route path="/parent/assessment" element={<Navigate to="/parent/analytics" replace />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}

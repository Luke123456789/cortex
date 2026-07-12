import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Parent from './pages/Parent.jsx'
import Quiz from './pages/Quiz.jsx'
import Play from './pages/Play.jsx'

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
            path="/play/:quizId"
            element={
              <ProtectedRoute>
                <Play />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>
    </AuthProvider>
  )
}

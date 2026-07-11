import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Parent from './pages/Parent.jsx'

export default function App() {
  return (
    <div className="app-shell">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/parent" element={<Parent />} />
      </Routes>
    </div>
  )
}

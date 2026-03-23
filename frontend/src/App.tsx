import { Routes, Route } from 'react-router-dom'
import HomePage from './HomePage'
import RegisterPage from './RegisterPage'
import LoginPage from './LoginPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
    </Routes>
  )
}

export default App

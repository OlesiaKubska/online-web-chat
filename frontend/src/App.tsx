import { Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import RegisterPage from "./RegisterPage";
import LoginPage from "./LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import RoomsPage from "./pages/RoomsPage";

function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/rooms"
        element={
          <ProtectedRoute>
            <RoomsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;

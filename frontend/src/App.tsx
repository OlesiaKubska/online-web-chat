import { Routes, Route } from "react-router-dom";
import HomePage from "./HomePage";
import RegisterPage from "./RegisterPage";
import LoginPage from "./LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import RoomsPage from "./pages/RoomsPage";
import RoomDetailPage from "./pages/RoomDetailPage";
import { usePresence } from "./lib/usePresence";

function App() {
  // Initialize presence tracking
  usePresence();

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
      <Route
        path="/rooms/:id"
        element={
          <ProtectedRoute>
            <RoomDetailPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default App;

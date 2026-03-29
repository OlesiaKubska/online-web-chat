import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import RegisterPage from "./RegisterPage";
import LoginPage from "./LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import RoomsPage from "./pages/RoomsPage";
import RoomDetailPage from "./pages/RoomDetailPage";
import FriendsPage from "./pages/FriendsPage";
import ProtectedLayout from "./ProtectedLayout";

function App() {
  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <ProtectedLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/rooms" element={<RoomsPage />} />
        <Route path="/rooms/:id" element={<RoomDetailPage />} />
        <Route path="/friends" element={<FriendsPage />} />
      </Route>
    </Routes>
  );
}

export default App;

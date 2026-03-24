import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser, getPublicRooms, getMyRooms } from "./lib/roomsApi";

interface User {
  id: number;
  username: string;
  email: string;
}

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/auth/me/", {
          credentials: "include",
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data);
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    async function run() {
      try {
        const me = await getCurrentUser();
        console.log("me", me);

        const publicRooms = await getPublicRooms();
        console.log("publicRooms", publicRooms);

        const myRooms = await getMyRooms();
        console.log("myRooms", myRooms);
      } catch (error) {
        console.error("API test failed:", error);
      }
    }

    run();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8000/api/auth/logout/", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
      navigate("/login");
    } catch {
      setUser(null);
      navigate("/login");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
      <h1>Home Page</h1>

      {user ? (
        <div>
          <p>Welcome, {user.username}!</p>
          <p>Email: {user.email}</p>
          <button
            onClick={handleLogout}
            style={{ padding: "10px 20px", cursor: "pointer" }}
          >
            Logout
          </button>
        </div>
      ) : (
        <p>Not logged in</p>
      )}
      <div>API test page</div>
    </div>
  );
};

export default HomePage;

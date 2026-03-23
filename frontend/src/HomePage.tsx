import { useEffect, useState } from "react";

interface User {
  id: number;
  username: string;
  email: string;
}

const HomePage = () => {
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

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:8000/api/auth/logout/", {
        method: "POST",
        credentials: "include",
      });
      setUser(null);
    } catch {
      setUser(null);
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
    </div>
  );
};

export default HomePage;

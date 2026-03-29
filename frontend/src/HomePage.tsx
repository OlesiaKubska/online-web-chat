import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ApiError, changePassword } from "./lib/api";

interface User {
  id: number;
  username: string;
  email: string;
}

const HomePage = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSuccessMessage("");
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });

      setSuccessMessage(response.message);
      setOldPassword("");
      setNewPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "Unable to change password.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

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

          <form onSubmit={handleChangePassword} style={{ marginTop: "24px" }}>
            <h2 style={{ marginBottom: "12px" }}>Change password</h2>
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{ display: "block", marginBottom: "4px" }}
                htmlFor="old-password"
              >
                Old password
              </label>
              <input
                id="old-password"
                type="password"
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                required
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <div style={{ marginBottom: "12px" }}>
              <label
                style={{ display: "block", marginBottom: "4px" }}
                htmlFor="new-password"
              >
                New password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                required
                style={{ width: "100%", padding: "8px" }}
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "10px 20px",
                cursor: isSubmitting ? "default" : "pointer",
              }}
            >
              {isSubmitting ? "Updating..." : "Change Password"}
            </button>
          </form>

          {successMessage ? (
            <p style={{ color: "green" }}>{successMessage}</p>
          ) : null}
          {errorMessage ? <p style={{ color: "red" }}>{errorMessage}</p> : null}

          <button
            onClick={handleLogout}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
              marginTop: "16px",
            }}
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

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/rooms/PageShell";
import { Panel } from "../components/rooms/Panel";
import { AppNavBar } from "../components/navigation/AppNavBar";
import { palette, inputStyle, primaryButtonStyle } from "../styles/roomsTheme";

const RegisterPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const redirectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current !== null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await fetch("http://localhost:8000/api/auth/register/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setMessage("Registration successful! Redirecting to log in...");
        setEmail("");
        setUsername("");
        setPassword("");

        if (redirectTimeoutRef.current !== null) {
          window.clearTimeout(redirectTimeoutRef.current);
        }

        redirectTimeoutRef.current = window.setTimeout(() => {
          navigate("/login");
        }, 1000);
      } else {
        setIsSuccess(false);

        if (data.email) {
          setMessage(data.email[0]);
        } else if (data.username) {
          setMessage(data.username[0]);
        } else if (data.password) {
          setMessage(data.password[0]);
        } else if (data.detail) {
          setMessage(data.detail);
        } else {
          setMessage("Registration failed");
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      setIsSuccess(false);
      setMessage("Network error");
    }
  };

  return (
    <PageShell>
      <div style={{ maxWidth: "980px", margin: "0 auto" }}>
        <AppNavBar mode="guest" />

        <Panel>
          <div style={{ maxWidth: "420px" }}>
            <h1 style={{ margin: "0 0 14px", fontSize: "40px" }}>Register</h1>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: "10px" }}>
                <label>Email:</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label>Username:</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label>Password:</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <button type="submit" style={primaryButtonStyle}>
                Register
              </button>
            </form>

            {message && (
              <p
                style={{
                  color: isSuccess ? palette.secondary : palette.danger,
                  marginTop: "20px",
                }}
              >
                {message}
              </p>
            )}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
};

export default RegisterPage;

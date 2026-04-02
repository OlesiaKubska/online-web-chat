import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "../components/rooms/PageShell";
import { Panel } from "../components/rooms/Panel";
import { AppNavBar } from "../components/navigation/AppNavBar";
import { palette, inputStyle, primaryButtonStyle } from "../styles/roomsTheme";
import {
  confirmPasswordReset,
  login,
  requestPasswordReset,
  ApiError,
} from "../lib/api";

const LoginPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetUid, setResetUid] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");

    try {
      await login({ email, password });
      setIsSuccess(true);
      setMessage("Login successful!");
      setEmail("");
      setPassword("");

      setTimeout(() => {
        navigate("/");
      }, 300);
    } catch (error) {
      setIsSuccess(false);
      if (error instanceof ApiError) {
        setMessage(error.message);
      } else {
        setMessage("Network error");
      }
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage("");

    try {
      const response = await requestPasswordReset(resetEmail);
      setResetSuccess(true);
      setResetMessage(response.message);

      if (response.reset) {
        setResetUid(response.reset.uid);
        setResetToken(response.reset.token);
      }
    } catch (error) {
      setResetSuccess(false);
      if (error instanceof ApiError) {
        setResetMessage(error.message);
      } else {
        setResetMessage("Network error");
      }
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetMessage("");

    try {
      const response = await confirmPasswordReset({
        uid: resetUid,
        token: resetToken,
        new_password: resetPassword,
      });
      setResetSuccess(true);
      setResetMessage(response.message);
      setResetPassword("");
    } catch (error) {
      setResetSuccess(false);
      if (error instanceof ApiError) {
        setResetMessage(error.message);
      } else {
        setResetMessage("Network error");
      }
    }
  };

  return (
    <PageShell>
      <div style={{ maxWidth: "980px", margin: "0 auto" }}>
        <AppNavBar mode="guest" />

        <Panel>
          <div style={{ maxWidth: "420px" }}>
            <h1 style={{ margin: "0 0 14px", fontSize: "40px" }}>Login</h1>

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
                Login
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

            <hr style={{ borderColor: palette.border, margin: "20px 0" }} />

            <h2 style={{ margin: "0 0 10px", fontSize: "22px" }}>
              Password Reset
            </h2>

            <form onSubmit={handleRequestReset}>
              <div style={{ marginBottom: "10px" }}>
                <label>Account Email:</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>
              <button type="submit" style={primaryButtonStyle}>
                Request Reset
              </button>
            </form>

            <form onSubmit={handleConfirmReset} style={{ marginTop: "12px" }}>
              <div style={{ marginBottom: "10px" }}>
                <label>Reset UID:</label>
                <input
                  type="text"
                  value={resetUid}
                  onChange={(e) => setResetUid(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label>Reset Token:</label>
                <input
                  type="text"
                  value={resetToken}
                  onChange={(e) => setResetToken(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <div style={{ marginBottom: "10px" }}>
                <label>New Password:</label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  style={inputStyle}
                />
              </div>

              <button type="submit" style={primaryButtonStyle}>
                Confirm Reset
              </button>
            </form>

            {resetMessage && (
              <p
                style={{
                  color: resetSuccess ? palette.secondary : palette.danger,
                  marginTop: "14px",
                }}
              >
                {resetMessage}
              </p>
            )}
          </div>
        </Panel>
      </div>
    </PageShell>
  );
};

export default LoginPage;

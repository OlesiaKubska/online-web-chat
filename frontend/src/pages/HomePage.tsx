import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  apiRequest,
  changePassword,
  deleteAccount,
  getActiveSessions,
  revokeSession,
  ApiError,
  type ActiveSession,
} from "../lib/api";
import { getCurrentUser, type User } from "../lib/roomsApi";
import { PageShell } from "../components/rooms/PageShell";
import { TopBar } from "../components/rooms/TopBar";
import { palette } from "../styles/roomsTheme";
import {
  QuickNavigationSection,
  type NavItem,
} from "../components/home/QuickNavigationSection";
import { SessionSection } from "../components/home/SessionSection";
import { AccountSecuritySection } from "../components/home/AccountSecuritySection";

const quickNavItems: NavItem[] = [
  { label: "Home", path: "/", subtitle: "Overview and shortcuts" },
  { label: "Rooms", path: "/rooms", subtitle: "Browse and create rooms" },
  {
    label: "Friends",
    path: "/friends",
    subtitle: "Manage friends and dialogs",
  },
  { label: "Login", path: "/login", subtitle: "Sign in to your account" },
  { label: "Register", path: "/register", subtitle: "Create a new account" },
];

export default function HomePage() {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordActionMessage, setPasswordActionMessage] = useState<
    string | null
  >(null);
  const [passwordActionSuccess, setPasswordActionSuccess] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteActionMessage, setDeleteActionMessage] = useState<string | null>(
    null,
  );
  const [deleteActionSuccess, setDeleteActionSuccess] = useState(false);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingSessionKey, setRevokingSessionKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  useEffect(() => {
    if (!user) {
      setSessions([]);
      return;
    }

    void loadActiveSessions();
  }, [user]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      setError(null);
      await apiRequest<unknown>("/auth/logout/", { method: "POST" });
      setUser(null);
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to log out");
    } finally {
      setLoggingOut(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordActionMessage(null);

    try {
      const response = await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setPasswordActionSuccess(true);
      setPasswordActionMessage(response.message);
      setOldPassword("");
      setNewPassword("");
    } catch (err) {
      setPasswordActionSuccess(false);
      if (err instanceof ApiError) {
        setPasswordActionMessage(err.message);
      } else {
        setPasswordActionMessage("Failed to change password.");
      }
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteActionMessage(null);

    try {
      const response = await deleteAccount({
        current_password: deletePassword || undefined,
      });
      setDeleteActionSuccess(true);
      setDeleteActionMessage(response.message);
      setUser(null);
      navigate("/login");
    } catch (err) {
      setDeleteActionSuccess(false);
      if (err instanceof ApiError) {
        setDeleteActionMessage(err.message);
      } else {
        setDeleteActionMessage("Failed to delete account.");
      }
    }
  };

  const loadActiveSessions = async () => {
    try {
      setSessionsLoading(true);
      setSessionsError(null);
      const nextSessions = await getActiveSessions();
      setSessions(nextSessions);
    } catch (err) {
      setSessionsError(
        err instanceof Error ? err.message : "Failed to load active sessions.",
      );
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleRevokeSession = async (sessionKey: string) => {
    try {
      setRevokingSessionKey(sessionKey);
      setSessionsError(null);
      const response = await revokeSession(sessionKey);
      if (response.revoked_current) {
        setUser(null);
        navigate("/login");
        return;
      }
      await loadActiveSessions();
    } catch (err) {
      setSessionsError(
        err instanceof Error ? err.message : "Failed to revoke session.",
      );
    } finally {
      setRevokingSessionKey(null);
    }
  };

  const heroCardStyle = {
    marginBottom: "24px",
    padding: "28px",
    borderRadius: "24px",
    border: `1px solid ${palette.border}`,
    background: `linear-gradient(135deg, ${palette.cardBg} 0%, ${palette.cardSoft} 100%)`,
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  } as const;

  return (
    <PageShell>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <TopBar />

        <header style={heroCardStyle}>
          <div
            style={{
              display: "inline-flex",
              padding: "6px 12px",
              borderRadius: "999px",
              backgroundColor: palette.accentSoft,
              color: "#c9bcff",
              fontSize: "13px",
              marginBottom: "14px",
              border: `1px solid ${palette.border}`,
            }}
          >
            Welcome
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "48px",
              lineHeight: 1,
              letterSpacing: "-1px",
              color: palette.text,
            }}
          >
            Classic Chat App
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: palette.textSoft,
              fontSize: "16px",
              maxWidth: "760px",
              lineHeight: 1.6,
            }}
          >
            A simple real-time chat platform with rooms, friend management, and
            direct dialogs built with Django, DRF, Channels, React, and
            TypeScript.
          </p>
        </header>

        {error && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              borderRadius: "16px",
              border: `1px solid ${palette.danger}`,
              backgroundColor: palette.dangerSoft,
              color: "#ffd5db",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <QuickNavigationSection
            items={quickNavItems}
            onOpen={(path) => navigate(path)}
          />

          <SessionSection
            loading={loading}
            user={user}
            loggingOut={loggingOut}
            onGoRooms={() => navigate("/rooms")}
            onGoFriends={() => navigate("/friends")}
            onLogin={() => navigate("/login")}
            onRegister={() => navigate("/register")}
            onLogout={handleLogout}
          />
        </div>

        {user ? (
          <AccountSecuritySection
            oldPassword={oldPassword}
            newPassword={newPassword}
            onOldPasswordChange={setOldPassword}
            onNewPasswordChange={setNewPassword}
            onChangePasswordSubmit={handleChangePassword}
            passwordActionMessage={passwordActionMessage}
            passwordActionSuccess={passwordActionSuccess}
            sessions={sessions}
            sessionsLoading={sessionsLoading}
            sessionsError={sessionsError}
            revokingSessionKey={revokingSessionKey}
            onRefreshSessions={() => {
              void loadActiveSessions();
            }}
            onRevokeSession={(sessionKey) => {
              void handleRevokeSession(sessionKey);
            }}
            deletePassword={deletePassword}
            onDeletePasswordChange={setDeletePassword}
            onDeleteAccountSubmit={handleDeleteAccount}
            deleteActionMessage={deleteActionMessage}
            deleteActionSuccess={deleteActionSuccess}
          />
        ) : null}
      </div>
    </PageShell>
  );
}

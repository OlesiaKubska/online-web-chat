import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { getCurrentUser, type User } from "../lib/roomsApi";
import { PageShell } from "../components/rooms/PageShell";
import { TopBar } from "../components/rooms/TopBar";
import SectionShell from "../components/rooms/SectionShell";
import { Panel } from "../components/rooms/Panel";
import {
  palette,
  primaryButtonStyle,
  secondaryButtonStyle,
  dangerButtonStyle,
} from "../styles/roomsTheme";

interface NavItem {
  label: string;
  path: string;
  subtitle: string;
}

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

  const heroCardStyle = {
    marginBottom: "24px",
    padding: "28px",
    borderRadius: "24px",
    border: `1px solid ${palette.border}`,
    background: `linear-gradient(135deg, ${palette.cardBg} 0%, ${palette.cardSoft} 100%)`,
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
  } as const;

  const navGridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "12px",
  } as const;

  const authActionGridStyle = {
    marginTop: "14px",
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
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
          <SectionShell
            title="Quick Navigation"
            subtitle="Jump to key pages of the application."
            count={quickNavItems.length}
          >
            <div style={navGridStyle}>
              {quickNavItems.map((item) => (
                <Panel key={item.path}>
                  <div style={{ fontWeight: 700, fontSize: "18px" }}>
                    {item.label}
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      color: palette.textMuted,
                      fontSize: "14px",
                    }}
                  >
                    {item.subtitle}
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(item.path)}
                    style={{ ...secondaryButtonStyle, marginTop: "14px" }}
                  >
                    Open {item.label}
                  </button>
                </Panel>
              ))}
            </div>
          </SectionShell>

          <SectionShell
            title="Session"
            subtitle={
              loading
                ? "Checking your authentication state..."
                : user
                  ? "You are signed in."
                  : "You are currently not signed in."
            }
            count={user ? 1 : 0}
          >
            {loading ? (
              <Panel>
                <div style={{ color: palette.textSoft, fontSize: "16px" }}>
                  Loading profile...
                </div>
              </Panel>
            ) : user ? (
              <Panel>
                <div style={{ fontWeight: 700, fontSize: "20px" }}>
                  {user.username}
                </div>
                <div
                  style={{
                    marginTop: "8px",
                    color: palette.textMuted,
                    fontSize: "14px",
                  }}
                >
                  {user.email}
                </div>

                <div style={authActionGridStyle}>
                  <button
                    type="button"
                    onClick={() => navigate("/rooms")}
                    style={primaryButtonStyle}
                  >
                    Go to Rooms
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate("/friends")}
                    style={secondaryButtonStyle}
                  >
                    Go to Friends
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    style={{
                      ...dangerButtonStyle,
                      width: "auto",
                      opacity: loggingOut ? 0.7 : 1,
                    }}
                  >
                    {loggingOut ? "Logging out..." : "Logout"}
                  </button>
                </div>
              </Panel>
            ) : (
              <Panel>
                <div style={{ color: palette.textSoft, fontSize: "16px" }}>
                  Sign in to access rooms, friends, and direct chat features.
                </div>
                <div style={authActionGridStyle}>
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    style={primaryButtonStyle}
                  >
                    Login
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/register")}
                    style={secondaryButtonStyle}
                  >
                    Register
                  </button>
                </div>
              </Panel>
            )}
          </SectionShell>
        </div>
      </div>
    </PageShell>
  );
}

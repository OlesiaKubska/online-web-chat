import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest } from "../../lib/api";
import {
  palette,
  primaryButtonStyle,
  secondaryButtonStyle,
  dangerButtonStyle,
} from "../../styles/roomsTheme";

type NavMode = "authenticated" | "guest";

interface AppNavBarProps {
  mode: NavMode;
}

interface NavLink {
  label: string;
  path: string;
}

const authLinks: NavLink[] = [
  { label: "Home", path: "/" },
  { label: "Rooms", path: "/rooms" },
  { label: "Friends", path: "/friends" },
];

const guestLinks: NavLink[] = [
  { label: "Home", path: "/" },
  { label: "Log in", path: "/login" },
  { label: "Register", path: "/register" },
];

export function AppNavBar({ mode }: AppNavBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [loggingOut, setLoggingOut] = useState(false);

  const links = mode === "authenticated" ? authLinks : guestLinks;

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await apiRequest<unknown>("/auth/logout/", { method: "POST" });
    } catch {
      // Ignore errors and continue to login to clear local route state.
    } finally {
      setLoggingOut(false);
      navigate("/login");
    }
  };

  return (
    <nav
      style={{
        marginBottom: "14px",
        padding: "12px",
        borderRadius: "16px",
        border: `1px solid ${palette.border}`,
        backgroundColor: palette.cardBg,
        boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {links.map((link) => {
        const isActive =
          link.path === "/"
            ? location.pathname === "/"
            : location.pathname.startsWith(link.path);

        return (
          <button
            key={link.path}
            type="button"
            onClick={() => navigate(link.path)}
            style={isActive ? primaryButtonStyle : secondaryButtonStyle}
          >
            {link.label}
          </button>
        );
      })}

      {mode === "authenticated" ? (
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          style={{
            ...dangerButtonStyle,
            width: "auto",
            marginLeft: "auto",
            opacity: loggingOut ? 0.7 : 1,
          }}
        >
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      ) : null}
    </nav>
  );
}

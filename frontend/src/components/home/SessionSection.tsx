import SectionShell from "../rooms/SectionShell";
import { Panel } from "../rooms/Panel";
import {
  palette,
  primaryButtonStyle,
  secondaryButtonStyle,
  dangerButtonStyle,
} from "../../styles/roomsTheme";
import type { User } from "../../lib/roomsApi";

interface SessionSectionProps {
  loading: boolean;
  user: User | null;
  loggingOut: boolean;
  onGoRooms: () => void;
  onGoFriends: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onLogout: () => void;
}

const authActionGridStyle = {
  marginTop: "14px",
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
} as const;

export function SessionSection({
  loading,
  user,
  loggingOut,
  onGoRooms,
  onGoFriends,
  onLogin,
  onRegister,
  onLogout,
}: SessionSectionProps) {
  return (
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
              onClick={onGoRooms}
              style={primaryButtonStyle}
            >
              Go to Rooms
            </button>

            <button
              type="button"
              onClick={onGoFriends}
              style={secondaryButtonStyle}
            >
              Go to Friends
            </button>

            <button
              type="button"
              onClick={onLogout}
              disabled={loggingOut}
              style={{
                ...dangerButtonStyle,
                width: "auto",
                opacity: loggingOut ? 0.7 : 1,
              }}
            >
              {loggingOut ? "Logging out..." : "Log out"}
            </button>
          </div>
        </Panel>
      ) : (
        <Panel>
          <div style={{ color: palette.textSoft, fontSize: "16px" }}>
            Log in to access rooms, friends, and direct chat features.
          </div>
          <div style={authActionGridStyle}>
            <button type="button" onClick={onLogin} style={primaryButtonStyle}>
              Log in
            </button>
            <button
              type="button"
              onClick={onRegister}
              style={secondaryButtonStyle}
            >
              Register
            </button>
          </div>
        </Panel>
      )}
    </SectionShell>
  );
}

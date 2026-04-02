import { Panel } from "../rooms/Panel";
import {
  palette,
  secondaryButtonStyle,
  dangerButtonStyle,
} from "../../styles/roomsTheme";
import type { ActiveSession } from "../../lib/api";

interface ActiveSessionsPanelProps {
  sessions: ActiveSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  revokingSessionKey: string | null;
  onRefresh: () => void;
  onRevokeSession: (sessionKey: string) => void;
}

export function ActiveSessionsPanel({
  sessions,
  sessionsLoading,
  sessionsError,
  revokingSessionKey,
  onRefresh,
  onRevokeSession,
}: ActiveSessionsPanelProps) {
  return (
    <Panel>
      <h3 style={{ margin: "0 0 10px", fontSize: "20px" }}>Active Sessions</h3>
      <p
        style={{
          margin: "0 0 10px",
          color: palette.textMuted,
          fontSize: "14px",
        }}
      >
        Review active browser sessions and revoke any session you do not trust.
      </p>
      <button
        type="button"
        onClick={onRefresh}
        style={secondaryButtonStyle}
        disabled={sessionsLoading}
      >
        {sessionsLoading ? "Refreshing..." : "Refresh Sessions"}
      </button>

      {sessionsError ? (
        <p style={{ marginTop: "10px", color: palette.danger }}>
          {sessionsError}
        </p>
      ) : null}

      <div style={{ marginTop: "12px", display: "grid", gap: "10px" }}>
        {sessions.map((session) => (
          <div
            key={session.session_key}
            style={{
              border: `1px solid ${palette.border}`,
              borderRadius: "12px",
              padding: "10px",
              background: palette.cardSoft,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: "4px" }}>
              {session.is_current ? "Current browser" : "Other browser"}
            </div>
            <div style={{ fontSize: "13px", color: palette.textMuted }}>
              Expires: {new Date(session.expires_at).toLocaleString()}
            </div>
            <div style={{ fontSize: "13px", color: palette.textMuted }}>
              IP: {session.ip_address || "Unknown"}
            </div>
            <div
              style={{
                marginTop: "4px",
                fontSize: "12px",
                color: palette.textMuted,
                wordBreak: "break-word",
              }}
            >
              {session.user_agent || "Unknown browser"}
            </div>
            <button
              type="button"
              onClick={() => onRevokeSession(session.session_key)}
              style={{
                ...dangerButtonStyle,
                marginTop: "8px",
                width: "auto",
              }}
              disabled={revokingSessionKey === session.session_key}
            >
              {revokingSessionKey === session.session_key
                ? "Revoking..."
                : session.is_current
                  ? "Log out this browser"
                  : "Log out this session"}
            </button>
          </div>
        ))}
        {!sessionsLoading && sessions.length === 0 ? (
          <div style={{ color: palette.textMuted, fontSize: "14px" }}>
            No active sessions found.
          </div>
        ) : null}
      </div>
    </Panel>
  );
}

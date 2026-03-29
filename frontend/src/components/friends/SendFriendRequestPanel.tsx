import type { FormEvent } from "react";
import { Panel } from "../rooms/Panel";
import {
  palette,
  inputStyle,
  primaryButtonStyle,
  panelTitleStyle,
} from "../../styles/roomsTheme";

interface SendFriendRequestPanelProps {
  username: string;
  message: string;
  submitting: boolean;
  hasPendingRequest: boolean;
  formError: string | null;
  onUsernameChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSubmit: (e: FormEvent) => void;
}

export function SendFriendRequestPanel({
  username,
  message,
  submitting,
  hasPendingRequest,
  formError,
  onUsernameChange,
  onMessageChange,
  onSubmit,
}: SendFriendRequestPanelProps) {
  const inlineErrorStyle = {
    marginBottom: "14px",
    padding: "12px",
    borderRadius: "12px",
    border: `1px solid ${palette.danger}`,
    backgroundColor: palette.dangerSoft,
    color: "#ffd5db",
    fontSize: "14px",
  } as const;

  const pendingHintStyle = {
    marginTop: "8px",
    color: "#ffd5db",
    fontSize: "14px",
  } as const;

  return (
    <Panel>
      <h2 style={panelTitleStyle}>Send Friend Request</h2>

      <form onSubmit={onSubmit}>
        <label htmlFor="friend-username">Username</label>
        <input
          id="friend-username"
          value={username}
          onChange={(e) => onUsernameChange(e.target.value)}
          placeholder="target username"
          disabled={submitting}
          style={inputStyle}
        />

        <label htmlFor="friend-message">Message (optional)</label>
        <input
          id="friend-message"
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          placeholder="optional note"
          disabled={submitting}
          style={inputStyle}
        />

        {formError && <div style={inlineErrorStyle}>{formError}</div>}

        <button
          type="submit"
          disabled={submitting || hasPendingRequest}
          style={{
            ...primaryButtonStyle,
            width: "100%",
            opacity: submitting || hasPendingRequest ? 0.7 : 1,
            cursor: submitting || hasPendingRequest ? "not-allowed" : "pointer",
          }}
        >
          {submitting ? "Sending..." : "Send request"}
        </button>

        {hasPendingRequest && (
          <div style={pendingHintStyle}>
            You already sent a pending request to this user.
          </div>
        )}
      </form>
    </Panel>
  );
}

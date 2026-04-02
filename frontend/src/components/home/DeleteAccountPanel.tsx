import { Panel } from "../rooms/Panel";
import {
  palette,
  inputStyle,
  dangerButtonStyle,
} from "../../styles/roomsTheme";

interface DeleteAccountPanelProps {
  deletePassword: string;
  onDeletePasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  actionMessage: string | null;
  actionSuccess: boolean;
}

export function DeleteAccountPanel({
  deletePassword,
  onDeletePasswordChange,
  onSubmit,
  actionMessage,
  actionSuccess,
}: DeleteAccountPanelProps) {
  return (
    <Panel>
      <h3 style={{ margin: "0 0 10px", fontSize: "20px" }}>Delete Account</h3>
      <p
        style={{
          margin: "0 0 10px",
          color: palette.textMuted,
          fontSize: "14px",
        }}
      >
        This permanently deletes your account and rooms you own.
      </p>
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label>Current Password (optional)</label>
          <input
            type="password"
            value={deletePassword}
            onChange={(e) => onDeletePasswordChange(e.target.value)}
            style={inputStyle}
          />
        </div>
        <button type="submit" style={dangerButtonStyle}>
          Delete My Account
        </button>
      </form>
      {actionMessage ? (
        <p
          style={{
            marginTop: "10px",
            color: actionSuccess ? palette.secondary : palette.danger,
          }}
        >
          {actionMessage}
        </p>
      ) : null}
    </Panel>
  );
}

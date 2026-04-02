import { Panel } from "../rooms/Panel";
import {
  palette,
  inputStyle,
  primaryButtonStyle,
} from "../../styles/roomsTheme";

interface ChangePasswordPanelProps {
  oldPassword: string;
  newPassword: string;
  onOldPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  actionMessage: string | null;
  actionSuccess: boolean;
}

export function ChangePasswordPanel({
  oldPassword,
  newPassword,
  onOldPasswordChange,
  onNewPasswordChange,
  onSubmit,
  actionMessage,
  actionSuccess,
}: ChangePasswordPanelProps) {
  return (
    <Panel>
      <h3 style={{ margin: "0 0 10px", fontSize: "20px" }}>Change Password</h3>
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: "10px" }}>
          <label>Current Password</label>
          <input
            type="password"
            value={oldPassword}
            onChange={(e) => onOldPasswordChange(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <div style={{ marginBottom: "10px" }}>
          <label>New Password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            required
            style={inputStyle}
          />
        </div>
        <button type="submit" style={primaryButtonStyle}>
          Update Password
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

import SectionShell from "../rooms/SectionShell";
import type { ActiveSession } from "../../lib/api";
import { ChangePasswordPanel } from "./ChangePasswordPanel";
import { ActiveSessionsPanel } from "./ActiveSessionsPanel";
import { DeleteAccountPanel } from "./DeleteAccountPanel";

interface AccountSecuritySectionProps {
  oldPassword: string;
  newPassword: string;
  onOldPasswordChange: (value: string) => void;
  onNewPasswordChange: (value: string) => void;
  onChangePasswordSubmit: (e: React.FormEvent) => void;
  passwordActionMessage: string | null;
  passwordActionSuccess: boolean;
  sessions: ActiveSession[];
  sessionsLoading: boolean;
  sessionsError: string | null;
  revokingSessionKey: string | null;
  onRefreshSessions: () => void;
  onRevokeSession: (sessionKey: string) => void;
  deletePassword: string;
  onDeletePasswordChange: (value: string) => void;
  onDeleteAccountSubmit: (e: React.FormEvent) => void;
  deleteActionMessage: string | null;
  deleteActionSuccess: boolean;
}

export function AccountSecuritySection({
  oldPassword,
  newPassword,
  onOldPasswordChange,
  onNewPasswordChange,
  onChangePasswordSubmit,
  passwordActionMessage,
  passwordActionSuccess,
  sessions,
  sessionsLoading,
  sessionsError,
  revokingSessionKey,
  onRefreshSessions,
  onRevokeSession,
  deletePassword,
  onDeletePasswordChange,
  onDeleteAccountSubmit,
  deleteActionMessage,
  deleteActionSuccess,
}: AccountSecuritySectionProps) {
  return (
    <SectionShell
      title="Account Security"
      subtitle="Manage password, active sessions, and account lifecycle actions."
      count={3}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        <ChangePasswordPanel
          oldPassword={oldPassword}
          newPassword={newPassword}
          onOldPasswordChange={onOldPasswordChange}
          onNewPasswordChange={onNewPasswordChange}
          onSubmit={onChangePasswordSubmit}
          actionMessage={passwordActionMessage}
          actionSuccess={passwordActionSuccess}
        />

        <ActiveSessionsPanel
          sessions={sessions}
          sessionsLoading={sessionsLoading}
          sessionsError={sessionsError}
          revokingSessionKey={revokingSessionKey}
          onRefresh={onRefreshSessions}
          onRevokeSession={onRevokeSession}
        />

        <DeleteAccountPanel
          deletePassword={deletePassword}
          onDeletePasswordChange={onDeletePasswordChange}
          onSubmit={onDeleteAccountSubmit}
          actionMessage={deleteActionMessage}
          actionSuccess={deleteActionSuccess}
        />
      </div>
    </SectionShell>
  );
}

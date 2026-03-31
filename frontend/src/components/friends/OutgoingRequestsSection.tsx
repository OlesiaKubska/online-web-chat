import SectionShell from "../rooms/SectionShell";
import { Panel } from "../rooms/Panel";
import { palette, secondaryButtonStyle } from "../../styles/roomsTheme";
import { PresenceBadge } from "../rooms/PresenceBadge";
import type { UserPresenceStatus } from "../../lib/api";
import type { FriendRequest } from "../../types/friends";

interface OutgoingRequestsSectionProps {
  outgoing: FriendRequest[];
  actionLoadingId: number | null;
  presenceByUserId: Record<number, UserPresenceStatus>;
  onCancel: (requestId: number) => void;
}

export function OutgoingRequestsSection({
  outgoing,
  actionLoadingId,
  presenceByUserId,
  onCancel,
}: OutgoingRequestsSectionProps) {
  const emptyTextStyle = { color: palette.textMuted, margin: 0 } as const;
  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  } as const;

  const messageStyle = {
    marginTop: "6px",
    color: palette.textMuted,
    fontSize: "14px",
  } as const;

  return (
    <SectionShell
      title="Outgoing Requests"
      subtitle="Requests you have sent and can still cancel."
      count={outgoing.length}
    >
      {outgoing.length === 0 ? (
        <p style={emptyTextStyle}>No outgoing requests.</p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {outgoing.map((request) => (
            <Panel key={request.id}>
              <div style={rowStyle}>
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>{request.to_username}</div>
                    <PresenceBadge status={presenceByUserId[request.to_user]} />
                  </div>
                  {request.message ? (
                    <div style={messageStyle}>{request.message}</div>
                  ) : null}
                </div>

                <button
                  onClick={() => onCancel(request.id)}
                  disabled={actionLoadingId === request.id}
                  style={{
                    ...secondaryButtonStyle,
                    opacity: actionLoadingId === request.id ? 0.7 : 1,
                  }}
                >
                  Cancel
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

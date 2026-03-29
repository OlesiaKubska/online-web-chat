import SectionShell from "../rooms/SectionShell";
import { Panel } from "../rooms/Panel";
import {
  palette,
  dangerButtonStyle,
  secondaryButtonStyle,
} from "../../styles/roomsTheme";
import type { FriendRequest } from "../../types/friends";

interface IncomingRequestsSectionProps {
  incoming: FriendRequest[];
  actionLoadingId: number | null;
  onAccept: (requestId: number) => void;
  onReject: (requestId: number) => void;
}

export function IncomingRequestsSection({
  incoming,
  actionLoadingId,
  onAccept,
  onReject,
}: IncomingRequestsSectionProps) {
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
      title="Incoming Requests"
      subtitle="Requests waiting for your decision."
      count={incoming.length}
    >
      {incoming.length === 0 ? (
        <p style={emptyTextStyle}>No incoming requests.</p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {incoming.map((request) => (
            <Panel key={request.id}>
              <div style={rowStyle}>
                <div>
                  <div style={{ fontWeight: 700 }}>{request.from_username}</div>
                  {request.message ? (
                    <div style={messageStyle}>{request.message}</div>
                  ) : null}
                </div>

                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => onAccept(request.id)}
                    disabled={actionLoadingId === request.id}
                    style={{
                      ...secondaryButtonStyle,
                      backgroundColor: palette.secondarySoft,
                      borderColor: palette.secondary,
                      color: palette.text,
                      opacity: actionLoadingId === request.id ? 0.7 : 1,
                    }}
                  >
                    Accept
                  </button>
                  <button
                    onClick={() => onReject(request.id)}
                    disabled={actionLoadingId === request.id}
                    style={{
                      ...dangerButtonStyle,
                      width: "auto",
                      opacity: actionLoadingId === request.id ? 0.7 : 1,
                    }}
                  >
                    Reject
                  </button>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

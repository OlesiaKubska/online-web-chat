import type { Room } from "../../types/room";
import {
  palette,
  primaryButtonStyle,
  secondaryButtonStyle,
  dangerButtonStyle,
  panelTitleStyle,
} from "../../styles/roomsTheme";
import { Panel } from "./Panel";
import { InfoRow } from "./InfoRow";

interface RoomSidebarProps {
  room: Room;
  actionLoading: boolean;
  onJoin: () => void;
  onLeave: () => void;
  onBack: () => void;
}

export function RoomSidebar({
  room,
  actionLoading,
  onJoin,
  onLeave,
  onBack,
}: RoomSidebarProps) {
  return (
    <aside
      style={{
        position: "sticky",
        top: "20px",
        display: "grid",
        gap: "20px",
      }}
    >
      <Panel>
        <h2 style={panelTitleStyle}>Room details</h2>
        <div style={{ display: "grid", gap: "12px" }}>
          <InfoRow label="Owner" value={room.owner_username} />
          <InfoRow
            label="Your role"
            value={room.my_role ? room.my_role : "Not a member"}
          />
          <InfoRow
            label="Created"
            value={new Date(room.created_at).toLocaleDateString()}
          />
          <InfoRow
            label="Visibility"
            value={room.visibility}
            tone={room.visibility === "public" ? "success" : "danger"}
          />
        </div>
      </Panel>

      <Panel>
        <h2 style={panelTitleStyle}>Actions</h2>

        <div style={{ display: "grid", gap: "12px" }}>
          {room.visibility === "public" && !room.joined && (
            <button
              onClick={onJoin}
              disabled={actionLoading}
              style={{
                ...primaryButtonStyle,
                opacity: actionLoading ? 0.7 : 1,
                cursor: actionLoading ? "not-allowed" : "pointer",
              }}
            >
              {actionLoading ? "Joining..." : "Join room"}
            </button>
          )}

          {room.joined && room.my_role !== "owner" && (
            <button
              onClick={onLeave}
              disabled={actionLoading}
              style={{
                ...dangerButtonStyle,
                opacity: actionLoading ? 0.7 : 1,
                cursor: actionLoading ? "not-allowed" : "pointer",
              }}
            >
              {actionLoading ? "Leaving..." : "Leave room"}
            </button>
          )}

          {room.my_role === "owner" && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "14px",
                border: `1px solid ${palette.border}`,
                backgroundColor: palette.cardSoft,
                color: palette.textMuted,
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              Owner cannot leave own room.
            </div>
          )}

          <button onClick={onBack} style={secondaryButtonStyle}>
            Back to rooms
          </button>
        </div>
      </Panel>
    </aside>
  );
}

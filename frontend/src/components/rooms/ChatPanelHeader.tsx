import type { Room } from "../../types/room";
import { palette } from "../../styles/roomsTheme";
import { MetaPill } from "./MetaPill";

interface ChatPanelHeaderProps {
  room: Room;
  messagesCount: number;
  wsStatus: "connecting" | "connected" | "disconnected";
}

export function ChatPanelHeader({
  room,
  messagesCount,
  wsStatus,
}: ChatPanelHeaderProps) {
  return (
    <div
      style={{
        marginBottom: "18px",
        display: "flex",
        justifyContent: "space-between",
        gap: "12px",
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <div>
        <h2 style={{ margin: 0, fontSize: "26px", color: palette.text }}>
          Chat
        </h2>
        <p
          style={{
            margin: "8px 0 0",
            color: palette.textMuted,
            fontSize: "14px",
          }}
        >
          {messagesCount} {messagesCount === 1 ? "message" : "messages"}
        </p>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <MetaPill
          tone={
            wsStatus === "connected"
              ? "success"
              : wsStatus === "connecting"
                ? "default"
                : "danger"
          }
        >
          {wsStatus === "connected"
            ? "Live"
            : wsStatus === "connecting"
              ? "Connecting..."
              : "Offline"}
        </MetaPill>

        <MetaPill tone={room.joined ? "success" : "default"}>
          {room.joined ? "Ready to chat" : "Join to participate"}
        </MetaPill>
      </div>
    </div>
  );
}

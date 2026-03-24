import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  palette,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../../styles/roomsTheme";
import { MetaPill } from "./MetaPill";
import type { Room } from "../../types/room";

interface RoomCardProps {
  room: Room;
  onJoin: (id: number) => Promise<void>;
}

export default function RoomCard({ room, onJoin }: RoomCardProps) {
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const handleJoinClick = async () => {
    try {
      setJoining(true);
      await onJoin(room.id);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      style={{
        borderRadius: "22px",
        border: `1px solid ${palette.border}`,
        background: `linear-gradient(180deg, ${palette.cardSoft} 0%, ${palette.cardBg} 100%)`,
        padding: "18px",
        display: "grid",
        gap: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              padding: "5px 10px",
              borderRadius: "999px",
              backgroundColor:
                room.visibility === "public"
                  ? "rgba(34, 199, 169, 0.15)"
                  : "rgba(255, 107, 129, 0.15)",
              color:
                room.visibility === "public"
                  ? palette.secondary
                  : palette.danger,
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "12px",
              border: `1px solid ${palette.border}`,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {room.visibility}
          </div>

          <h3
            style={{
              margin: 0,
              fontSize: "24px",
              color: palette.text,
            }}
          >
            {room.name}
          </h3>
        </div>

        <button
          onClick={() => navigate(`/rooms/${room.id}`)}
          style={secondaryButtonStyle}
        >
          Open
        </button>
      </div>

      <p
        style={{
          margin: 0,
          color: room.description ? palette.textSoft : palette.textMuted,
          lineHeight: 1.5,
          minHeight: "44px",
        }}
      >
        {room.description || "No description provided yet."}
      </p>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <MetaPill>
          {`${room.member_count} member${room.member_count !== 1 ? "s" : ""}`}
        </MetaPill>
        <MetaPill>Owner: {room.owner_username}</MetaPill>
        {room.joined && <MetaPill tone="success">Joined</MetaPill>}
        {room.my_role && (
          <MetaPill tone="accent">Role: {room.my_role}</MetaPill>
        )}
      </div>

      {room.visibility === "public" && !room.joined && (
        <button
          onClick={handleJoinClick}
          disabled={joining}
          style={{
            ...primaryButtonStyle,
            opacity: joining ? 0.7 : 1,
            cursor: joining ? "not-allowed" : "pointer",
          }}
        >
          {joining ? "Joining..." : "Join room"}
        </button>
      )}
    </div>
  );
}

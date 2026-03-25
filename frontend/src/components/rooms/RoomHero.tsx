import type { Room } from "../../types/room";
import { palette } from "../../styles/roomsTheme";
import { StatCard } from "./StatCard";

interface RoomHeroProps {
  room: Room;
}

export function RoomHero({ room }: RoomHeroProps) {
  return (
    <header
      style={{
        marginBottom: "24px",
        padding: "28px",
        borderRadius: "24px",
        border: `1px solid ${palette.border}`,
        background: `linear-gradient(135deg, ${palette.cardBg} 0%, ${palette.cardSoft} 100%)`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "20px",
          flexWrap: "wrap",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1, minWidth: "280px" }}>
          <div
            style={{
              display: "inline-flex",
              padding: "6px 12px",
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
              marginBottom: "14px",
              border: `1px solid ${palette.border}`,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {room.visibility} room
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "44px",
              lineHeight: 1,
              letterSpacing: "-1px",
              color: palette.text,
            }}
          >
            {room.name}
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              color: room.description ? palette.textSoft : palette.textMuted,
              fontSize: "16px",
              maxWidth: "720px",
              lineHeight: 1.6,
            }}
          >
            {room.description || "This room does not have a description yet."}
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(120px, 1fr))",
            gap: "12px",
            minWidth: "280px",
          }}
        >
          <StatCard label="Members" value={room.member_count} />
          <StatCard label="Joined" value={room.joined ? "Yes" : "No"} />
        </div>
      </div>
    </header>
  );
}

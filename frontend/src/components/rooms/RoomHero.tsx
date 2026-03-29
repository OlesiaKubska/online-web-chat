import type { Room } from "../../types/room";
import { palette } from "../../styles/roomsTheme";
import { StatCard } from "./StatCard";

interface RoomHeroProps {
  room: Room;
  currentUserId: number | null;
}

function getRoomDisplayMeta(room: Room, currentUserId: number | null) {
  if (!room.is_direct) {
    return {
      badgeText: `${room.visibility} room`,
      badgeBackground:
        room.visibility === "public"
          ? "rgba(34, 199, 169, 0.15)"
          : "rgba(255, 107, 129, 0.15)",
      badgeColor:
        room.visibility === "public" ? palette.secondary : palette.danger,
      title: room.name,
      subtitle:
        room.description || "This room does not have a description yet.",
      subtitleMuted: !room.description,
    };
  }

  let otherUsername: string | null = null;
  if (currentUserId !== null) {
    if (room.dm_user1 === currentUserId) {
      otherUsername = room.dm_user2_username;
    } else if (room.dm_user2 === currentUserId) {
      otherUsername = room.dm_user1_username;
    }
  }

  if (!otherUsername) {
    otherUsername = room.dm_user1_username || room.dm_user2_username || null;
  }

  return {
    badgeText: "DIRECT MESSAGE",
    badgeBackground: palette.accentSoft,
    badgeColor: "#c9bcff",
    title: otherUsername || "Direct Message",
    subtitle: "Private conversation",
    subtitleMuted: false,
  };
}

export function RoomHero({ room, currentUserId }: RoomHeroProps) {
  const meta = getRoomDisplayMeta(room, currentUserId);

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
              backgroundColor: meta.badgeBackground,
              color: meta.badgeColor,
              fontSize: "12px",
              fontWeight: 700,
              marginBottom: "14px",
              border: `1px solid ${palette.border}`,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            {meta.badgeText}
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
            {meta.title}
          </h1>

          <p
            style={{
              margin: "14px 0 0",
              color: meta.subtitleMuted ? palette.textMuted : palette.textSoft,
              fontSize: "16px",
              maxWidth: "720px",
              lineHeight: 1.6,
            }}
          >
            {meta.subtitle}
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

import { palette } from "../../styles/roomsTheme";

export function FriendsHero() {
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
          display: "inline-flex",
          padding: "6px 12px",
          borderRadius: "999px",
          backgroundColor: palette.accentSoft,
          color: "#c9bcff",
          fontSize: "13px",
          marginBottom: "14px",
          border: `1px solid ${palette.border}`,
        }}
      >
        Friends workspace
      </div>

      <h1
        style={{
          margin: 0,
          fontSize: "46px",
          lineHeight: 1,
          letterSpacing: "-1px",
        }}
      >
        Friends
      </h1>

      <p
        style={{
          margin: "12px 0 0",
          color: palette.textSoft,
          fontSize: "16px",
          maxWidth: "720px",
        }}
      >
        Manage friend requests, accept incoming invites, and keep your
        connections organized.
      </p>
    </header>
  );
}

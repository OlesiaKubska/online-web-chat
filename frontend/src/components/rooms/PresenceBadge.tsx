import { palette } from "../../styles/roomsTheme";
import type { UserPresenceStatus } from "../../lib/api";

interface PresenceBadgeProps {
  status?: UserPresenceStatus;
}

const toneByStatus: Record<
  UserPresenceStatus,
  { bg: string; color: string; label: string }
> = {
  online: {
    bg: palette.secondarySoft,
    color: palette.secondary,
    label: "online",
  },
  afk: {
    bg: "rgba(255, 184, 77, 0.12)",
    color: palette.warning,
    label: "AFK",
  },
  offline: {
    bg: "rgba(139, 151, 184, 0.14)",
    color: palette.textMuted,
    label: "offline",
  },
};

export function PresenceBadge({ status = "offline" }: PresenceBadgeProps) {
  const tone = toneByStatus[status];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "3px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.03em",
        backgroundColor: tone.bg,
        color: tone.color,
        border: `1px solid ${palette.border}`,
      }}
    >
      {tone.label}
    </span>
  );
}

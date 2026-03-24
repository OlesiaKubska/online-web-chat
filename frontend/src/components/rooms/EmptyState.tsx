import { palette } from "../../styles/roomsTheme";

interface EmptyStateProps {
  text: string;
}

export default function EmptyState({ text }: EmptyStateProps) {
  return (
    <div
      style={{
        borderRadius: "18px",
        border: `1px dashed ${palette.border}`,
        backgroundColor: palette.cardSoft,
        color: palette.textMuted,
        padding: "24px",
        textAlign: "center",
      }}
    >
      {text}
    </div>
  );
}

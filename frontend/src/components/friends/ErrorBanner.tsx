import { palette } from "../../styles/roomsTheme";

interface ErrorBannerProps {
  error: string;
}

export function ErrorBanner({ error }: ErrorBannerProps) {
  return (
    <div
      style={{
        marginBottom: "20px",
        padding: "14px 16px",
        borderRadius: "16px",
        border: `1px solid ${palette.danger}`,
        backgroundColor: palette.dangerSoft,
        color: "#ffd5db",
      }}
    >
      {error}
    </div>
  );
}

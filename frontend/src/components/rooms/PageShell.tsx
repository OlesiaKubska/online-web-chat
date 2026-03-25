import { palette } from "../../styles/roomsTheme";

interface PageShellProps {
  children: React.ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top, ${palette.pageGlow} 0%, ${palette.pageBg} 45%)`,
        color: palette.text,
        padding: "32px 20px 48px",
      }}
    >
      {children}
    </div>
  );
}

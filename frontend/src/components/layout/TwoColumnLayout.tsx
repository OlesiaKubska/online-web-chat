import type { ReactNode } from "react";

interface TwoColumnLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarWidth?: string;
  gap?: string;
}

export function TwoColumnLayout({
  sidebar,
  children,
  sidebarWidth = "340px",
  gap = "24px",
}: TwoColumnLayoutProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `${sidebarWidth} minmax(0, 1fr)`,
        gap,
        alignItems: "start",
      }}
    >
      <div style={{ minWidth: 0 }}>{sidebar}</div>
      <main style={{ display: "grid", gap, minWidth: 0 }}>{children}</main>
    </div>
  );
}

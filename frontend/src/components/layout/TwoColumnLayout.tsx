import type { ReactNode } from "react";

type SidebarPosition = "left" | "right";

interface TwoColumnLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  sidebarWidth?: string;
  gap?: string;
  sidebarPosition?: SidebarPosition;
}

export function TwoColumnLayout({
  sidebar,
  children,
  sidebarWidth = "340px",
  gap = "24px",
  sidebarPosition = "right",
}: TwoColumnLayoutProps) {
  const sidebarNode = <div style={{ minWidth: 0 }}>{sidebar}</div>;
  const mainNode = (
    <main style={{ display: "grid", gap, minWidth: 0 }}>{children}</main>
  );

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          sidebarPosition === "left"
            ? `${sidebarWidth} minmax(0, 1fr)`
            : `minmax(0, 1fr) ${sidebarWidth}`,
        gap,
        alignItems: "start",
      }}
    >
      {sidebarPosition === "left" ? (
        <>
          {sidebarNode}
          {mainNode}
        </>
      ) : (
        <>
          {mainNode}
          {sidebarNode}
        </>
      )}
    </div>
  );
}

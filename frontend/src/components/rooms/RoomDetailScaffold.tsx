import type { ReactNode } from "react";
import { PageShell } from "./PageShell";
import { TopBar } from "./TopBar";

type RoomDetailScaffoldProps = {
  onBack: () => void;
  children: ReactNode;
};

export function RoomDetailScaffold({
  onBack,
  children,
}: RoomDetailScaffoldProps) {
  return (
    <PageShell>
      <TopBar onBack={onBack} />
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>{children}</div>
    </PageShell>
  );
}

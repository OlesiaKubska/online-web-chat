import { ChatPanel } from "./ChatPanel";
import { RoomHero } from "./RoomHero";
import { RoomSidebar } from "./RoomSidebar";
import type { Room } from "../../types/room";

type RoomSidebarProps = React.ComponentProps<typeof RoomSidebar>;
type ChatPanelProps = React.ComponentProps<typeof ChatPanel>;

type RoomDetailContentProps = {
  room: Room;
  currentUserId: number | null;
  sidebarProps: RoomSidebarProps;
  chatPanelProps: ChatPanelProps;
};

export function RoomDetailContent({
  room,
  currentUserId,
  sidebarProps,
  chatPanelProps,
}: RoomDetailContentProps) {
  return (
    <>
      <RoomHero room={room} currentUserId={currentUserId} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "340px minmax(0, 1fr)",
          gap: "24px",
          alignItems: "start",
        }}
      >
        <RoomSidebar {...sidebarProps} />

        <main style={{ display: "grid", gap: "24px" }}>
          <ChatPanel {...chatPanelProps} />
        </main>
      </div>
    </>
  );
}

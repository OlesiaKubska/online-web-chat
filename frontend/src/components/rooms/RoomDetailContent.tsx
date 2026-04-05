import { ChatPanel } from "./ChatPanel";
import { RoomHero } from "./RoomHero";
import { RoomSidebar } from "./RoomSidebar";
import { TwoColumnLayout } from "../layout/TwoColumnLayout";
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

      <TwoColumnLayout sidebar={<RoomSidebar {...sidebarProps} />}>
        <ChatPanel {...chatPanelProps} />
      </TwoColumnLayout>
    </>
  );
}

import SectionShell from "../rooms/SectionShell";
import { Panel } from "../rooms/Panel";
import { palette, secondaryButtonStyle } from "../../styles/roomsTheme";
import type { Room } from "../../types/room";

interface DirectDialogsSectionProps {
  dialogs: Room[];
  currentUserId: number | null;
  onOpenDialog: (roomId: number) => void;
}

function resolveOtherUsername(
  dialog: Room,
  currentUserId: number | null,
): string {
  const otherUsername =
    dialog.dm_user1 === currentUserId
      ? dialog.dm_user2_username
      : dialog.dm_user1_username;
  return otherUsername ?? "Unknown";
}

export function DirectDialogsSection({
  dialogs,
  currentUserId,
  onOpenDialog,
}: DirectDialogsSectionProps) {
  const emptyTextStyle = { color: palette.textMuted, margin: 0 } as const;
  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
  } as const;

  return (
    <SectionShell
      title="Direct Dialogs"
      subtitle="Your one-on-one conversations."
      count={dialogs.length}
    >
      {dialogs.length === 0 ? (
        <p style={emptyTextStyle}>
          No direct dialogs yet. Message a friend to start one.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "12px" }}>
          {dialogs.map((dialog) => (
            <Panel key={dialog.id}>
              <div style={rowStyle}>
                <div style={{ fontWeight: 700 }}>
                  {resolveOtherUsername(dialog, currentUserId)}
                </div>
                <button
                  type="button"
                  onClick={() => onOpenDialog(dialog.id)}
                  style={secondaryButtonStyle}
                >
                  Open chat
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

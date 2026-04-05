import SectionShell from "../rooms/SectionShell";
import { MetaPill } from "../rooms/MetaPill";
import { Panel } from "../rooms/Panel";
import { palette, secondaryButtonStyle } from "../../styles/roomsTheme";
import { PresenceBadge } from "../rooms/PresenceBadge";
import type { UserPresenceStatus } from "../../lib/api";
import type { Room } from "../../types/room";

interface DirectDialogsSectionProps {
  dialogs: Room[];
  currentUserId: number | null;
  presenceByUserId: Record<number, UserPresenceStatus>;
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

function resolveOtherUserId(
  dialog: Room,
  currentUserId: number | null,
): number | null {
  if (dialog.dm_user1 === currentUserId) {
    return dialog.dm_user2;
  }
  return dialog.dm_user1;
}

export function DirectDialogsSection({
  dialogs,
  currentUserId,
  presenceByUserId,
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
          {dialogs.map((dialog) => {
            const otherUserId = resolveOtherUserId(dialog, currentUserId);

            return (
              <Panel key={dialog.id}>
                <div style={rowStyle}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontWeight: 700 }}>
                      {resolveOtherUsername(dialog, currentUserId)}
                    </div>
                    <PresenceBadge
                      status={
                        otherUserId !== null
                          ? presenceByUserId[otherUserId]
                          : undefined
                      }
                    />
                    {dialog.unread_count > 0 && (
                      <MetaPill tone="danger">
                        Unread: {dialog.unread_count}
                      </MetaPill>
                    )}
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
            );
          })}
        </div>
      )}
    </SectionShell>
  );
}

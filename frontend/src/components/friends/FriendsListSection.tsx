import SectionShell from "../rooms/SectionShell";
import { Panel } from "../rooms/Panel";
import {
  palette,
  primaryButtonStyle,
  secondaryButtonStyle,
  dangerButtonStyle,
} from "../../styles/roomsTheme";
import type { Friend } from "../../types/friends";

interface FriendsListSectionProps {
  friends: Friend[];
  messageLoadingId: number | null;
  friendActionLoadingKey: string | null;
  onMessage: (friendId: number) => void;
  onRemoveFriend: (friendId: number) => void;
  onBanUser: (friendId: number) => void;
}

export function FriendsListSection({
  friends,
  messageLoadingId,
  friendActionLoadingKey,
  onMessage,
  onRemoveFriend,
  onBanUser,
}: FriendsListSectionProps) {
  const emptyTextStyle = { color: palette.textMuted, margin: 0 } as const;
  const emailStyle = {
    marginTop: "6px",
    color: palette.textMuted,
    fontSize: "14px",
  } as const;

  const actionsRowStyle = {
    marginTop: "12px",
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
  } as const;

  return (
    <SectionShell
      title="Friends List"
      subtitle="People already connected with you."
      count={friends.length}
    >
      {friends.length === 0 ? (
        <p style={emptyTextStyle}>No friends yet.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "12px",
          }}
        >
          {friends.map((friend) => (
            <Panel key={friend.id}>
              <div style={{ fontWeight: 700 }}>{friend.username}</div>
              <div style={emailStyle}>{friend.email}</div>

              <div style={actionsRowStyle}>
                <button
                  type="button"
                  onClick={() => onMessage(friend.id)}
                  disabled={messageLoadingId === friend.id}
                  style={{
                    ...primaryButtonStyle,
                    opacity: messageLoadingId === friend.id ? 0.7 : 1,
                  }}
                >
                  {messageLoadingId === friend.id ? "Opening..." : "Message"}
                </button>

                <button
                  type="button"
                  onClick={() => onRemoveFriend(friend.id)}
                  disabled={friendActionLoadingKey === `remove-${friend.id}`}
                  style={{
                    ...secondaryButtonStyle,
                    opacity:
                      friendActionLoadingKey === `remove-${friend.id}`
                        ? 0.7
                        : 1,
                  }}
                >
                  {friendActionLoadingKey === `remove-${friend.id}`
                    ? "Removing..."
                    : "Remove friend"}
                </button>

                <button
                  type="button"
                  onClick={() => onBanUser(friend.id)}
                  disabled={friendActionLoadingKey === `ban-${friend.id}`}
                  style={{
                    ...dangerButtonStyle,
                    width: "auto",
                    opacity:
                      friendActionLoadingKey === `ban-${friend.id}` ? 0.7 : 1,
                  }}
                >
                  {friendActionLoadingKey === `ban-${friend.id}`
                    ? "Banning..."
                    : "Ban user"}
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </SectionShell>
  );
}

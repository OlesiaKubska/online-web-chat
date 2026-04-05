import type { Message } from "../../types/message";
import type { Room } from "../../types/room";
import { palette, secondaryButtonStyle } from "../../styles/roomsTheme";

export type FriendRelationStatus = "none" | "friend" | "outgoing" | "incoming";

interface MessageActionsProps {
  room: Room;
  message: Message;
  currentUserId: number | null;
  editingMessageId: number | null;
  canModerateRoom: boolean;
  moderationActionLoadingKey: string | null;
  friendRequestLoadingKey: string | null;
  friendRelationByUserId: Record<number, FriendRelationStatus>;
  onReply: (message: Message) => void;
  onStartEdit: (message: Message) => void;
  onDeleteMessage: (messageId: number) => void;
  onRemoveMember: (userId: number) => void;
  onBanMember: (userId: number) => void;
  onSendFriendRequest: (username: string, userId: number) => void;
}

export function MessageActions({
  room,
  message,
  currentUserId,
  editingMessageId,
  canModerateRoom,
  moderationActionLoadingKey,
  friendRequestLoadingKey,
  friendRelationByUserId,
  onReply,
  onStartEdit,
  onDeleteMessage,
  onRemoveMember,
  onBanMember,
  onSendFriendRequest,
}: MessageActionsProps) {
  const relationStatus = friendRelationByUserId[message.user] ?? "none";
  const isRequestLoading =
    friendRequestLoadingKey === `request-${message.user}`;
  const isActionDisabled =
    isRequestLoading ||
    relationStatus === "friend" ||
    relationStatus === "outgoing" ||
    relationStatus === "incoming";

  const friendActionLabel = isRequestLoading
    ? "Sending request..."
    : relationStatus === "friend"
      ? "Friend"
      : relationStatus === "outgoing"
        ? "Request sent"
        : relationStatus === "incoming"
          ? "Respond"
          : "Add friend";

  return (
    <>
      <button
        type="button"
        onClick={() => onReply(message)}
        disabled={!room.joined}
        style={{
          ...secondaryButtonStyle,
          fontSize: "12px",
          padding: "4px 8px",
          minWidth: "auto",
          opacity: !room.joined ? 0.6 : 1,
          cursor: !room.joined ? "not-allowed" : "pointer",
        }}
      >
        Reply
      </button>
      {currentUserId === message.user && (
        <button
          type="button"
          onClick={() => onStartEdit(message)}
          disabled={
            editingMessageId !== null && editingMessageId !== message.id
          }
          style={{
            ...secondaryButtonStyle,
            fontSize: "12px",
            padding: "4px 8px",
            minWidth: "auto",
            opacity:
              editingMessageId !== null && editingMessageId !== message.id
                ? 0.6
                : 1,
            cursor:
              editingMessageId !== null && editingMessageId !== message.id
                ? "not-allowed"
                : "pointer",
          }}
        >
          Edit
        </button>
      )}
      {(currentUserId === message.user || canModerateRoom) && (
        <button
          type="button"
          onClick={() => onDeleteMessage(message.id)}
          disabled={
            editingMessageId !== null && editingMessageId !== message.id
          }
          style={{
            ...secondaryButtonStyle,
            fontSize: "12px",
            padding: "4px 8px",
            minWidth: "auto",
            opacity:
              editingMessageId !== null && editingMessageId !== message.id
                ? 0.6
                : 1,
            cursor:
              editingMessageId !== null && editingMessageId !== message.id
                ? "not-allowed"
                : "pointer",
            backgroundColor: "rgba(220, 53, 69, 0.1)",
            borderColor: palette.danger,
            color: palette.danger,
          }}
        >
          {currentUserId === message.user ? "Delete" : "Mod delete"}
        </button>
      )}

      {canModerateRoom &&
        currentUserId !== null &&
        currentUserId !== message.user &&
        !room.is_direct && (
          <>
            <button
              type="button"
              onClick={() => onRemoveMember(message.user)}
              disabled={moderationActionLoadingKey === `remove-${message.user}`}
              style={{
                ...secondaryButtonStyle,
                fontSize: "12px",
                padding: "4px 8px",
                minWidth: "auto",
                opacity:
                  moderationActionLoadingKey === `remove-${message.user}`
                    ? 0.6
                    : 1,
              }}
            >
              {moderationActionLoadingKey === `remove-${message.user}`
                ? "Removing & banning..."
                : "Remove & ban"}
            </button>

            <button
              type="button"
              onClick={() => onBanMember(message.user)}
              disabled={moderationActionLoadingKey === `ban-${message.user}`}
              style={{
                ...secondaryButtonStyle,
                fontSize: "12px",
                padding: "4px 8px",
                minWidth: "auto",
                opacity:
                  moderationActionLoadingKey === `ban-${message.user}`
                    ? 0.6
                    : 1,
                backgroundColor: "rgba(220, 53, 69, 0.1)",
                borderColor: palette.danger,
                color: palette.danger,
              }}
            >
              {moderationActionLoadingKey === `ban-${message.user}`
                ? "Banning..."
                : "Ban member"}
            </button>
          </>
        )}

      {!room.is_direct &&
        currentUserId !== null &&
        currentUserId !== message.user && (
          <button
            type="button"
            onClick={() =>
              onSendFriendRequest(message.user_username, message.user)
            }
            disabled={isActionDisabled}
            style={{
              ...secondaryButtonStyle,
              fontSize: "12px",
              padding: "4px 8px",
              minWidth: "auto",
              opacity: isActionDisabled ? 0.6 : 1,
            }}
          >
            {friendActionLabel}
          </button>
        )}
    </>
  );
}

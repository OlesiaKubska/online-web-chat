import { useState } from "react";

import type { Message } from "../../types/message";
import type { Room } from "../../types/room";
import { palette, secondaryButtonStyle } from "../../styles/roomsTheme";
import { ConfirmModal } from "./ConfirmModal";

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
  const [showModerationMenu, setShowModerationMenu] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    "delete-message" | "remove-member" | "ban-member" | null
  >(null);

  const relationStatus = friendRelationByUserId[message.user] ?? "none";
  const isRequestLoading =
    friendRequestLoadingKey === `request-${message.user}`;
  const isActionDisabled =
    isRequestLoading ||
    relationStatus === "friend" ||
    relationStatus === "outgoing" ||
    relationStatus === "incoming";
  const canModerateThisMessage =
    canModerateRoom &&
    currentUserId !== null &&
    currentUserId !== message.user &&
    !room.is_direct;

  const friendActionLabel = isRequestLoading
    ? "Sending request..."
    : relationStatus === "friend"
      ? "Friend"
      : relationStatus === "outgoing"
        ? "Request sent"
        : relationStatus === "incoming"
          ? "Respond"
          : "Add friend";

  const handleConfirmAction = () => {
    if (pendingAction === "delete-message") {
      onDeleteMessage(message.id);
    } else if (pendingAction === "remove-member") {
      onRemoveMember(message.user);
    } else if (pendingAction === "ban-member") {
      onBanMember(message.user);
    }

    setPendingAction(null);
    setShowModerationMenu(false);
  };

  const confirmLabel =
    pendingAction === "delete-message"
      ? currentUserId === message.user
        ? "Delete message"
        : "Delete as moderator"
      : pendingAction === "remove-member"
        ? "Remove & ban"
        : "Ban member";

  const confirmMessage =
    pendingAction === "delete-message"
      ? currentUserId === message.user
        ? `Delete your message from ${message.user_username}?`
        : `Delete ${message.user_username}'s message as a moderator?`
      : pendingAction === "remove-member"
        ? `Remove ${message.user_username} from the room and ban them?`
        : `Ban ${message.user_username} from this room?`;

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
      {(currentUserId === message.user || !canModerateThisMessage) &&
        (currentUserId === message.user || canModerateRoom) && (
          <button
            type="button"
            onClick={() => setPendingAction("delete-message")}
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

      {canModerateThisMessage && (
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setShowModerationMenu((current) => !current)}
            style={{
              ...secondaryButtonStyle,
              fontSize: "12px",
              padding: "4px 8px",
              minWidth: "auto",
            }}
          >
            Moderation ▾
          </button>

          {showModerationMenu && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "calc(100% + 6px)",
                minWidth: "170px",
                borderRadius: "12px",
                border: `1px solid ${palette.border}`,
                backgroundColor: palette.cardBg,
                boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
                padding: "8px",
                display: "grid",
                gap: "6px",
                zIndex: 20,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowModerationMenu(false);
                  setPendingAction("delete-message");
                }}
                style={{
                  ...secondaryButtonStyle,
                  width: "100%",
                  textAlign: "left",
                  backgroundColor: "rgba(220, 53, 69, 0.1)",
                  borderColor: palette.danger,
                  color: palette.danger,
                }}
              >
                Delete message
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModerationMenu(false);
                  setPendingAction("remove-member");
                }}
                style={{
                  ...secondaryButtonStyle,
                  width: "100%",
                  textAlign: "left",
                }}
              >
                Remove & ban member
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModerationMenu(false);
                  setPendingAction("ban-member");
                }}
                style={{
                  ...secondaryButtonStyle,
                  width: "100%",
                  textAlign: "left",
                  backgroundColor: "rgba(220, 53, 69, 0.1)",
                  borderColor: palette.danger,
                  color: palette.danger,
                }}
              >
                Ban member
              </button>
            </div>
          )}
        </div>
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

      <ConfirmModal
        open={pendingAction !== null}
        title={
          pendingAction === "delete-message"
            ? currentUserId === message.user
              ? "Delete message?"
              : "Delete message as moderator?"
            : pendingAction === "remove-member"
              ? "Remove and ban member?"
              : "Ban member?"
        }
        message={confirmMessage}
        confirmLabel={confirmLabel}
        danger={pendingAction !== null}
        loading={
          pendingAction === "remove-member"
            ? moderationActionLoadingKey === `remove-${message.user}`
            : pendingAction === "ban-member"
              ? moderationActionLoadingKey === `ban-${message.user}`
              : false
        }
        onCancel={() => {
          setPendingAction(null);
          setShowModerationMenu(false);
        }}
        onConfirm={handleConfirmAction}
      />
    </>
  );
}

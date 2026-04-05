import type { RefObject } from "react";

import type { UserPresenceStatus } from "../../lib/api";
import type { Message } from "../../types/message";
import type { Room } from "../../types/room";
import {
  inputStyle,
  palette,
  secondaryButtonStyle,
} from "../../styles/roomsTheme";
import { PresenceBadge } from "./PresenceBadge";
import { MessageActions, type FriendRelationStatus } from "./MessageActions";
import { MessageAttachments } from "./MessageAttachments";

interface MessageCardProps {
  room: Room;
  message: Message;
  currentUserId: number | null;
  editingMessageId: number | null;
  editingMessageContent: string;
  onEditingMessageChange: (content: string) => void;
  onStartEdit: (message: Message) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  editingSaving: boolean;
  onDeleteMessage: (messageId: number) => void;
  onReply: (message: Message) => void;
  onBanMember: (userId: number) => void;
  onRemoveMember: (userId: number) => void;
  moderationActionLoadingKey: string | null;
  friendRequestLoadingKey: string | null;
  friendRelationByUserId: Record<number, FriendRelationStatus>;
  onSendFriendRequest: (username: string, userId: number) => void;
  presenceByUserId: Record<number, UserPresenceStatus>;
  canModerateRoom: boolean;
  messagesEndRef?: RefObject<HTMLDivElement | null>;
  showEndMarker?: boolean;
}

export function MessageCard({
  room,
  message,
  currentUserId,
  editingMessageId,
  editingMessageContent,
  onEditingMessageChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  editingSaving,
  onDeleteMessage,
  onReply,
  onBanMember,
  onRemoveMember,
  moderationActionLoadingKey,
  friendRequestLoadingKey,
  friendRelationByUserId,
  onSendFriendRequest,
  presenceByUserId,
  canModerateRoom,
  messagesEndRef,
  showEndMarker = false,
}: MessageCardProps) {
  return (
    <div
      style={{
        padding: "12px 16px",
        borderRadius: "12px",
        backgroundColor: palette.cardSoft,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <MessageActions
          room={room}
          message={message}
          currentUserId={currentUserId}
          editingMessageId={editingMessageId}
          canModerateRoom={canModerateRoom}
          moderationActionLoadingKey={moderationActionLoadingKey}
          friendRequestLoadingKey={friendRequestLoadingKey}
          friendRelationByUserId={friendRelationByUserId}
          onReply={onReply}
          onStartEdit={onStartEdit}
          onDeleteMessage={onDeleteMessage}
          onRemoveMember={onRemoveMember}
          onBanMember={onBanMember}
          onSendFriendRequest={onSendFriendRequest}
        />
      </div>

      {message.reply_to_message && (
        <div
          style={{
            marginBottom: "8px",
            padding: "8px 12px",
            borderRadius: "8px",
            backgroundColor: "rgba(0,0,0,0.2)",
            borderLeft: `3px solid ${palette.secondary}`,
            fontSize: "14px",
            color: palette.textSoft,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            Replying to {message.reply_to_message.user_username}
          </div>
          <div
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: 1.4,
            }}
          >
            {message.reply_to_message.content.length > 100
              ? `${message.reply_to_message.content.substring(0, 100)}...`
              : message.reply_to_message.content}
          </div>
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "8px",
          marginBottom: "4px",
        }}
      >
        <span style={{ fontWeight: 600, color: palette.text }}>
          {message.user_username}
        </span>
        <PresenceBadge status={presenceByUserId[message.user]} />
        <span
          style={{
            fontSize: "12px",
            color: palette.textMuted,
          }}
        >
          {new Date(message.created_at).toLocaleString()}
        </span>
        {message.edited && (
          <span
            style={{
              fontSize: "12px",
              color: palette.textMuted,
              fontStyle: "italic",
            }}
          >
            (edited)
          </span>
        )}
      </div>

      {editingMessageId === message.id ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <textarea
            value={editingMessageContent}
            onChange={(event) => onEditingMessageChange(event.target.value)}
            rows={3}
            style={{
              ...inputStyle,
              minHeight: "90px",
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              onClick={onSaveEdit}
              disabled={!editingMessageContent.trim() || editingSaving}
              style={{
                ...secondaryButtonStyle,
                minWidth: "80px",
                opacity:
                  !editingMessageContent.trim() || editingSaving ? 0.6 : 1,
                cursor:
                  !editingMessageContent.trim() || editingSaving
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {editingSaving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={editingSaving}
              style={{
                ...secondaryButtonStyle,
                minWidth: "80px",
                opacity: editingSaving ? 0.6 : 1,
                cursor: editingSaving ? "not-allowed" : "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div
            style={{
              color: palette.textSoft,
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
            }}
          >
            {message.content}
          </div>

          <MessageAttachments attachments={message.attachments ?? []} />
        </div>
      )}

      {showEndMarker ? <div ref={messagesEndRef} /> : null}
    </div>
  );
}

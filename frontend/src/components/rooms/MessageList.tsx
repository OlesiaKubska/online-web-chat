import type { RefObject } from "react";

import type { UserPresenceStatus } from "../../lib/api";
import type { Message } from "../../types/message";
import type { Room } from "../../types/room";
import { palette } from "../../styles/roomsTheme";
import { MessageCard } from "./MessageCard";
import type { FriendRelationStatus } from "./MessageActions";

interface MessageListProps {
  room: Room;
  messages: Message[];
  messagesLoading: boolean;
  messagesError: string | null;
  loadingOlderMessages: boolean;
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
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  olderMessagesSentinelRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

function MessagesLoadingState() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "32px 16px",
        color: palette.textMuted,
      }}
    >
      <div style={{ fontSize: "14px" }}>Loading messages...</div>
    </div>
  );
}

function MessagesErrorState({ messagesError }: { messagesError: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "32px 16px",
        color: palette.danger,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "16px", fontWeight: 600 }}>
        Failed to load messages
      </div>
      <div style={{ fontSize: "14px", opacity: 0.8 }}>{messagesError}</div>
    </div>
  );
}

function MessagesEmptyState({ room }: { room: Room }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "48px 16px",
        color: palette.textMuted,
        textAlign: "center",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 600,
            marginBottom: "8px",
          }}
        >
          No messages yet
        </div>
        <div style={{ fontSize: "14px", opacity: 0.8 }}>
          {room.joined
            ? "Start the conversation by sending the first message!"
            : "Join the room to start chatting with others."}
        </div>
      </div>
    </div>
  );
}

export function MessageList({
  room,
  messages,
  messagesLoading,
  messagesError,
  loadingOlderMessages,
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
  messagesContainerRef,
  olderMessagesSentinelRef,
  messagesEndRef,
}: MessageListProps) {
  const orderedMessages = [...messages].reverse();

  if (messagesLoading) {
    return <MessagesLoadingState />;
  }

  if (messagesError) {
    return <MessagesErrorState messagesError={messagesError} />;
  }

  if (messages.length === 0) {
    return <MessagesEmptyState room={room} />;
  }

  return (
    <div
      ref={messagesContainerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        flex: 1,
        minHeight: 0,
        maxHeight: "52vh",
        overflowY: "auto",
        paddingRight: "4px",
      }}
    >
      <div ref={olderMessagesSentinelRef} style={{ height: "1px" }} />
      {loadingOlderMessages && (
        <div
          style={{
            textAlign: "center",
            color: palette.textMuted,
            fontSize: "13px",
          }}
        >
          Loading older messages...
        </div>
      )}
      {orderedMessages.map((message, index) => (
        <MessageCard
          key={message.id}
          room={room}
          message={message}
          currentUserId={currentUserId}
          editingMessageId={editingMessageId}
          editingMessageContent={editingMessageContent}
          onEditingMessageChange={onEditingMessageChange}
          onStartEdit={onStartEdit}
          onCancelEdit={onCancelEdit}
          onSaveEdit={onSaveEdit}
          editingSaving={editingSaving}
          onDeleteMessage={onDeleteMessage}
          onReply={onReply}
          onBanMember={onBanMember}
          onRemoveMember={onRemoveMember}
          moderationActionLoadingKey={moderationActionLoadingKey}
          friendRequestLoadingKey={friendRequestLoadingKey}
          friendRelationByUserId={friendRelationByUserId}
          onSendFriendRequest={onSendFriendRequest}
          presenceByUserId={presenceByUserId}
          canModerateRoom={canModerateRoom}
          messagesEndRef={messagesEndRef}
          showEndMarker={index === orderedMessages.length - 1}
        />
      ))}
    </div>
  );
}

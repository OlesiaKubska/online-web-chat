import { useEffect, useRef, type ClipboardEvent } from "react";
import type { UserPresenceStatus } from "../../lib/api";
import type { Message } from "../../types/message";
import type { Room } from "../../types/room";
import { palette } from "../../styles/roomsTheme";
import { ChatPanelHeader } from "./ChatPanelHeader";
import { FriendRequestFeedbackBanner } from "./FriendRequestFeedbackBanner";
import { MessageComposer } from "./MessageComposer";
import { MessageList } from "./MessageList";
import type { FriendRelationStatus } from "./MessageActions";
import { Panel } from "./Panel";
import { ReplyPreviewBanner } from "./ReplyPreviewBanner";

interface ChatPanelProps {
  room: Room;
  messages: Message[];
  messagesLoading: boolean;
  messagesError: string | null;
  messageContent: string;
  onMessageChange: (content: string) => void;
  onSendMessage: () => void;
  pendingAttachments: File[];
  onPendingAttachmentsChange: (files: FileList | null) => void;
  attachmentComment: string;
  onAttachmentCommentChange: (value: string) => void;
  onComposerPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onRemovePendingAttachment: (index: number) => void;
  uploadingAttachments: boolean;
  sendingMessage: boolean;
  replyTo: Message | null;
  onReply: (message: Message) => void;
  onCancelReply: () => void;
  onLoadOlderMessages: () => void;
  loadingOlderMessages: boolean;
  hasMoreMessages: boolean;
  currentUserId: number | null;
  editingMessageId: number | null;
  editingMessageContent: string;
  onEditingMessageChange: (content: string) => void;
  onStartEdit: (message: Message) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  editingSaving: boolean;
  onDeleteMessage: (messageId: number) => void;
  onBanMember: (userId: number) => void;
  onRemoveMember: (userId: number) => void;
  moderationActionLoadingKey: string | null;
  friendRequestLoadingKey: string | null;
  friendRequestFeedback: {
    kind: "success" | "error";
    text: string;
  } | null;
  friendRelationByUserId: Record<number, FriendRelationStatus>;
  onSendFriendRequest: (username: string, userId: number) => void;
  presenceByUserId: Record<number, UserPresenceStatus>;
  wsStatus: "connecting" | "connected" | "disconnected";
}

export function ChatPanel({
  room,
  messages,
  messagesLoading,
  messagesError,
  messageContent,
  onMessageChange,
  onSendMessage,
  pendingAttachments,
  onPendingAttachmentsChange,
  attachmentComment,
  onAttachmentCommentChange,
  onComposerPaste,
  onRemovePendingAttachment,
  uploadingAttachments,
  sendingMessage,
  replyTo,
  onReply,
  onCancelReply,
  onLoadOlderMessages,
  loadingOlderMessages,
  hasMoreMessages,
  currentUserId,
  editingMessageId,
  editingMessageContent,
  onEditingMessageChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  editingSaving,
  onDeleteMessage,
  onBanMember,
  onRemoveMember,
  moderationActionLoadingKey,
  friendRequestLoadingKey,
  friendRequestFeedback,
  friendRelationByUserId,
  onSendFriendRequest,
  presenceByUserId,
  wsStatus,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const olderMessagesSentinelRef = useRef<HTMLDivElement | null>(null);
  const canModerateRoom =
    !room.is_direct && (room.my_role === "owner" || room.my_role === "admin");

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user is near bottom (within 120px)
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      120;

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    const sentinel = olderMessagesSentinelRef.current;
    if (
      !container ||
      !sentinel ||
      !hasMoreMessages ||
      loadingOlderMessages ||
      messagesLoading
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadOlderMessages();
        }
      },
      {
        root: container,
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    hasMoreMessages,
    loadingOlderMessages,
    messagesLoading,
    onLoadOlderMessages,
  ]);

  return (
    <Panel>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "18px",
          minHeight: "min(70vh, 760px)",
        }}
      >
        <ChatPanelHeader
          room={room}
          messagesCount={messages.length}
          wsStatus={wsStatus}
        />

        <div
          style={{
            flex: 1,
            minHeight: "360px",
            borderRadius: "22px",
            border: `1px dashed ${palette.border}`,
            background: `linear-gradient(180deg, ${palette.cardSoft} 0%, ${palette.cardBg} 100%)`,
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {friendRequestFeedback ? (
            <FriendRequestFeedbackBanner feedback={friendRequestFeedback} />
          ) : null}

          {replyTo ? (
            <ReplyPreviewBanner
              replyTo={replyTo}
              onCancelReply={onCancelReply}
            />
          ) : null}

          <MessageList
            room={room}
            messages={messages}
            messagesLoading={messagesLoading}
            messagesError={messagesError}
            loadingOlderMessages={loadingOlderMessages}
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
            messagesContainerRef={messagesContainerRef}
            olderMessagesSentinelRef={olderMessagesSentinelRef}
            messagesEndRef={messagesEndRef}
          />
        </div>

        <MessageComposer
          room={room}
          messageContent={messageContent}
          onMessageChange={onMessageChange}
          onSendMessage={onSendMessage}
          pendingAttachments={pendingAttachments}
          onPendingAttachmentsChange={onPendingAttachmentsChange}
          attachmentComment={attachmentComment}
          onAttachmentCommentChange={onAttachmentCommentChange}
          onComposerPaste={onComposerPaste}
          onRemovePendingAttachment={onRemovePendingAttachment}
          uploadingAttachments={uploadingAttachments}
          sendingMessage={sendingMessage}
        />
      </div>
    </Panel>
  );
}

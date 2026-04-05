import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type ClipboardEvent,
} from "react";
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

const AUTO_SCROLL_THRESHOLD_PX = 120;

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
  const shouldStickToBottomRef = useRef(true);
  const initialAutoScrollDoneRef = useRef(false);
  const preserveScrollStateRef = useRef({
    pending: false,
    scrollHeight: 0,
    scrollTop: 0,
  });
  const canModerateRoom =
    !room.is_direct && (room.my_role === "owner" || room.my_role === "admin");

  const updateNearBottomState = useCallback(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;
    shouldStickToBottomRef.current =
      distanceFromBottom <= AUTO_SCROLL_THRESHOLD_PX;
  }, []);

  const handleLoadOlderMessagesWithPreservedScroll = useCallback(() => {
    const container = messagesContainerRef.current;
    if (
      !container ||
      loadingOlderMessages ||
      messagesLoading ||
      !hasMoreMessages ||
      preserveScrollStateRef.current.pending
    ) {
      return;
    }

    preserveScrollStateRef.current = {
      pending: true,
      scrollHeight: container.scrollHeight,
      scrollTop: container.scrollTop,
    };

    onLoadOlderMessages();
  }, [
    hasMoreMessages,
    loadingOlderMessages,
    messagesLoading,
    onLoadOlderMessages,
  ]);

  useEffect(() => {
    initialAutoScrollDoneRef.current = false;
    shouldStickToBottomRef.current = true;
    preserveScrollStateRef.current = {
      pending: false,
      scrollHeight: 0,
      scrollTop: 0,
    };
  }, [room.id]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    updateNearBottomState();

    const handleScroll = () => {
      updateNearBottomState();
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [messages.length, messagesLoading, updateNearBottomState]);

  useLayoutEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    if (preserveScrollStateRef.current.pending) {
      if (loadingOlderMessages) {
        return;
      }

      const { scrollHeight, scrollTop } = preserveScrollStateRef.current;
      const scrollDelta = container.scrollHeight - scrollHeight;
      container.scrollTop = scrollTop + Math.max(scrollDelta, 0);
      preserveScrollStateRef.current.pending = false;
      updateNearBottomState();
      return;
    }

    if (!initialAutoScrollDoneRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      initialAutoScrollDoneRef.current = true;
      updateNearBottomState();
      return;
    }

    if (shouldStickToBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      updateNearBottomState();
    }
  }, [loadingOlderMessages, messages, updateNearBottomState]);

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
          handleLoadOlderMessagesWithPreservedScroll();
        }
      },
      {
        root: container,
        threshold: 0,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    handleLoadOlderMessagesWithPreservedScroll,
    hasMoreMessages,
    loadingOlderMessages,
    messagesLoading,
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

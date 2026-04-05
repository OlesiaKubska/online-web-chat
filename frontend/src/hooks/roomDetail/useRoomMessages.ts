import {
  useCallback,
  useEffect,
  useState,
  type ClipboardEvent,
} from "react";

import { ApiError, uploadMessageAttachment } from "../../lib/api";
import {
  deleteMessage,
  editMessage,
  getRoomMessages,
  sendMessage,
} from "../../lib/messagesApi";
import type { Message } from "../../types/message";
import type { Room } from "../../types/room";

type UseRoomMessagesOptions = {
  room: Room | null;
  clearFriendRequestFeedback: () => void;
};

export function useRoomMessages({
  room,
  clearFriendRequestFeedback,
}: UseRoomMessagesOptions) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesHasMore, setMessagesHasMore] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  const [messageContent, setMessageContent] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [attachmentComment, setAttachmentComment] = useState("");
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState("");
  const [editingSaving, setEditingSaving] = useState(false);

  useEffect(() => {
    if (room?.joined) return;

    setMessages([]);
    setMessagesError(null);
    setMessagesLoading(false);
    setMessagesHasMore(true);
    setLoadingOlderMessages(false);
    setPendingAttachments([]);
    setUploadingAttachments(false);
  }, [room?.joined]);

  useEffect(() => {
    if (!room?.id || !room.joined) {
      return;
    }

    void fetchMessages(room.id);
  }, [room?.id, room?.joined]);

  const handleIncomingMessage = useCallback((incomingMessage: Message) => {
    setMessages((prev) => {
      const exists = prev.some((message) => message.id === incomingMessage.id);
      if (exists) {
        return prev;
      }

      return [incomingMessage, ...prev];
    });
  }, []);

  const fetchMessages = async (roomId: number) => {
    try {
      setMessagesLoading(true);
      setMessagesError(null);
      const messagesData = await getRoomMessages(roomId);
      setMessages(messagesData);
      setMessagesHasMore(messagesData.length === 20);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        setMessages([]);
        setMessagesError(null);
        return;
      }

      setMessagesError(
        err instanceof Error ? err.message : "Failed to load messages",
      );
    } finally {
      setMessagesLoading(false);
    }
  };

  const handleLoadOlderMessages = async () => {
    if (!room || loadingOlderMessages || messagesLoading || !messagesHasMore) {
      return;
    }

    const oldestMessage = messages[messages.length - 1];
    if (!oldestMessage) {
      return;
    }

    try {
      setLoadingOlderMessages(true);
      const olderMessages = await getRoomMessages(
        room.id,
        oldestMessage.created_at,
      );

      setMessages((prev) => {
        const existingIds = new Set(prev.map((message) => message.id));
        const uniqueOlder = olderMessages.filter(
          (message) => !existingIds.has(message.id),
        );
        return [...prev, ...uniqueOlder];
      });

      setMessagesHasMore(olderMessages.length === 20);
    } catch (err: unknown) {
      setMessagesError(
        err instanceof Error ? err.message : "Failed to load older messages",
      );
    } finally {
      setLoadingOlderMessages(false);
    }
  };

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id);
    setEditingMessageContent(message.content);
    setReplyTo(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingMessageContent("");
  };

  const handleSaveEdit = async () => {
    if (!room || editingMessageId === null) return;

    const trimmedContent = editingMessageContent.trim();
    if (!trimmedContent) return;

    try {
      setEditingSaving(true);
      const updatedMessage = await editMessage(editingMessageId, {
        content: trimmedContent,
      });
      setMessages((prev) =>
        prev.map((message) =>
          message.id === updatedMessage.id ? updatedMessage : message,
        ),
      );
      setEditingMessageId(null);
      setEditingMessageContent("");
    } catch (err: unknown) {
      setMessagesError(
        err instanceof Error ? err.message : "Failed to save edited message",
      );
    } finally {
      setEditingSaving(false);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    if (!window.confirm("Are you sure you want to delete this message?")) {
      return;
    }

    try {
      await deleteMessage(messageId);
      setMessages((prev) => prev.filter((message) => message.id !== messageId));
    } catch (err: unknown) {
      setMessagesError(
        err instanceof Error ? err.message : "Failed to delete message",
      );
    }
  };

  const handlePendingAttachmentsChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      setPendingAttachments([]);
      return;
    }

    setPendingAttachments(Array.from(files));
  };

  const handleComposerPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardFiles = Array.from(event.clipboardData.files || []);
    if (clipboardFiles.length === 0) {
      return;
    }

    event.preventDefault();
    setPendingAttachments((prev) => [...prev, ...clipboardFiles]);
  };

  const handleRemovePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, current) => current !== index));
  };

  const handleSendMessage = async (ws: WebSocket | null) => {
    if (!room) return;

    const trimmedContent = messageContent.trim();
    const comment = attachmentComment.trim();
    const hasAttachments = pendingAttachments.length > 0;
    const contentToSend =
      trimmedContent ||
      (hasAttachments ? comment || "Shared an attachment" : "");

    if (!contentToSend) return;

    try {
      setSendingMessage(true);
      setMessagesError(null);
      const shouldUseRest =
        hasAttachments || !ws || ws.readyState !== WebSocket.OPEN;

      if (!shouldUseRest && ws) {
        ws.send(
          JSON.stringify({
            action: "send_message",
            content: contentToSend,
            reply_to: replyTo?.id ?? undefined,
          }),
        );
      } else {
        const newMessage = await sendMessage(room.id, {
          content: contentToSend,
          reply_to: replyTo?.id ?? undefined,
        });

        let nextMessage = newMessage;
        if (hasAttachments) {
          setUploadingAttachments(true);
          const uploaded = await Promise.all(
            pendingAttachments.map((file) =>
              uploadMessageAttachment(newMessage.id, file, comment),
            ),
          );
          nextMessage = {
            ...newMessage,
            attachments: [...newMessage.attachments, ...uploaded],
          };
        }

        setMessages((prev) => [nextMessage, ...prev]);
      }

      setMessageContent("");
      setPendingAttachments([]);
      setAttachmentComment("");
      setReplyTo(null);
      clearFriendRequestFeedback();
    } catch (err: unknown) {
      setMessagesError(
        err instanceof Error ? err.message : "Failed to send message",
      );
    } finally {
      setSendingMessage(false);
      setUploadingAttachments(false);
    }
  };

  const handleSendFriendFeedbackReset = () => {
    clearFriendRequestFeedback();
  };

  const handleMessageChange = (value: string) => {
    setMessageContent(value);
    handleSendFriendFeedbackReset();
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    handleSendFriendFeedbackReset();
  };

  const handleCancelReply = () => {
    setReplyTo(null);
    handleSendFriendFeedbackReset();
  };

  return {
    messages,
    messagesLoading,
    messagesError,
    setMessagesError,
    messagesHasMore,
    loadingOlderMessages,
    messageContent,
    pendingAttachments,
    attachmentComment,
    uploadingAttachments,
    sendingMessage,
    replyTo,
    currentMessageReplyId: replyTo?.id ?? null,
    editingMessageId,
    editingMessageContent,
    editingSaving,
    handleIncomingMessage,
    handleLoadOlderMessages,
    handleStartEdit,
    handleCancelEdit,
    handleSaveEdit,
    handleDeleteMessage,
    handlePendingAttachmentsChange,
    handleComposerPaste,
    handleRemovePendingAttachment,
    handleSendMessage,
    handleMessageChange,
    handleReply,
    handleCancelReply,
    setAttachmentComment,
    setEditingMessageContent,
  };
}

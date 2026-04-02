import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getRoomById,
  leaveRoom,
  joinRoom,
  getCurrentUser,
  banRoomMember,
  removeRoomMember,
  getRoomBannedUsers,
  unbanRoomUser,
  deleteRoom,
  getRoomMembers,
  updateMemberRole,
  invitePrivateRoomUser,
} from "../lib/roomsApi";
import {
  getRoomMessages,
  sendMessage,
  editMessage,
  deleteMessage,
} from "../lib/messagesApi";
import type { Room, RoomBan, RoomMember } from "../types/room";
import type { Message } from "../types/message";
import { LoadingState } from "../components/rooms/LoadingState";
import { ErrorState } from "../components/rooms/ErrorState";
import { RoomDetailScaffold } from "../components/rooms/RoomDetailScaffold";
import { RoomDetailContent } from "../components/rooms/RoomDetailContent";
import {
  ApiError,
  getUsersPresence,
  type UserPresenceStatus,
  uploadMessageAttachment,
} from "../lib/api";
import {
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  sendFriendRequestByUsername,
} from "../lib/friendsApi";

type FriendRelationStatus = "none" | "friend" | "outgoing" | "incoming";

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [messagesHasMore, setMessagesHasMore] = useState(true);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  const [messageContent, setMessageContent] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<File[]>([]);
  const [uploadingAttachments, setUploadingAttachments] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingMessageContent, setEditingMessageContent] = useState("");
  const [editingSaving, setEditingSaving] = useState(false);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");

  const [bannedUsers, setBannedUsers] = useState<RoomBan[]>([]);
  const [showBannedUsers, setShowBannedUsers] = useState(false);
  const [bansLoading, setBansLoading] = useState(false);
  const [moderationActionLoadingKey, setModerationActionLoadingKey] = useState<
    string | null
  >(null);
  const [friendRequestLoadingKey, setFriendRequestLoadingKey] = useState<
    string | null
  >(null);
  const [friendRequestFeedback, setFriendRequestFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [friendRelationByUserId, setFriendRelationByUserId] = useState<
    Record<number, FriendRelationStatus>
  >({});
  const [presenceByUserId, setPresenceByUserId] = useState<
    Record<number, UserPresenceStatus>
  >({});

  const isMountedRef = useRef(true);
  const friendRequestFeedbackTimeoutRef = useRef<number | null>(null);

  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [invitingUser, setInvitingUser] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError("Invalid room ID");
      setLoading(false);
      return;
    }

    const roomId = parseInt(id, 10);
    if (isNaN(roomId)) {
      setError("Invalid room ID");
      setLoading(false);
      return;
    }

    fetchRoom(roomId);
  }, [id]);

  useEffect(() => {
    if (room?.joined) return;

    setMessages([]);
    setMessagesError(null);
    setMessagesLoading(false);
    setMessagesHasMore(true);
    setLoadingOlderMessages(false);
    setPendingAttachments([]);
    setUploadingAttachments(false);
    setWsStatus("disconnected");
  }, [room?.joined]);

  useEffect(() => {
    if (!room?.id || !room.joined) {
      return;
    }

    fetchMessages(room.id);
  }, [room?.id, room?.joined]);

  useEffect(() => {
    if (!room?.joined) {
      setFriendRelationByUserId({});
      return;
    }

    const loadFriendRelations = async () => {
      try {
        const [friends, incomingRequests, outgoingRequests] = await Promise.all(
          [
            getFriends(),
            getIncomingFriendRequests(),
            getOutgoingFriendRequests(),
          ],
        );

        const relationMap: Record<number, FriendRelationStatus> = {};

        friends.forEach((friend) => {
          relationMap[friend.id] = "friend";
        });

        outgoingRequests
          .filter((request) => request.status === "pending")
          .forEach((request) => {
            if (!relationMap[request.to_user]) {
              relationMap[request.to_user] = "outgoing";
            }
          });

        incomingRequests
          .filter((request) => request.status === "pending")
          .forEach((request) => {
            if (!relationMap[request.from_user]) {
              relationMap[request.from_user] = "incoming";
            }
          });

        setFriendRelationByUserId(relationMap);
      } catch {
        setFriendRelationByUserId({});
      }
    };

    void loadFriendRelations();
  }, [room?.joined, room?.id]);

  useEffect(() => {
    if (!room?.id || !room.joined) {
      setPresenceByUserId({});
      return;
    }

    const userIds = Array.from(
      new Set([
        ...messages.map((message) => message.user),
        ...roomMembers.map((member) => member.user_id),
      ]),
    );
    if (userIds.length === 0) {
      setPresenceByUserId({});
      return;
    }

    let cancelled = false;

    const fetchPresence = async () => {
      try {
        const statuses = await getUsersPresence(userIds);
        if (cancelled) {
          return;
        }

        const map: Record<number, UserPresenceStatus> = {};
        statuses.forEach((statusItem) => {
          map[statusItem.user_id] = statusItem.status;
        });
        setPresenceByUserId(map);
      } catch {
        if (!cancelled) {
          setPresenceByUserId({});
        }
      }
    };

    void fetchPresence();
    const intervalId = window.setInterval(() => {
      void fetchPresence();
    }, 15000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [room?.id, room?.joined, messages, roomMembers]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUserId(user.id);
      } catch {
        setCurrentUserId(null);
      }
    };

    fetchUser();
  }, []);

  // WebSocket connection effect
  useEffect(() => {
    if (!room?.id) return;
    if (!room.joined) return; // Only connect if user has joined the room

    const wsBaseUrl = import.meta.env.VITE_WS_BASE_URL || "ws://localhost:8000";
    const wsUrl = `${wsBaseUrl}/ws/rooms/${room.id}/`;

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log(`Connected to WebSocket for room ${room.id}`);
      setWs(socket);
      setWsStatus("connected");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "message") {
          setMessages((prev) => {
            // Avoid duplicates by checking if message already exists
            const exists = prev.some((m) => m.id === data.message.id);
            if (exists) {
              return prev;
            }
            return [data.message, ...prev];
          });
        }
      } catch (err) {
        console.error("Failed to parse WebSocket message:", err);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
      setWsStatus("disconnected");
    };

    socket.onclose = () => {
      console.log(`Disconnected from WebSocket for room ${room.id}`);
      setWs(null);
      setWsStatus("disconnected");

      // Schedule reconnect after 2 seconds if component is still mounted
      if (isMountedRef.current) {
        setWsStatus("connecting");
        setTimeout(() => {
          if (isMountedRef.current) {
            setReconnectKey((prev) => prev + 1);
          }
        }, 2000);
      }
    };

    return () => {
      socket.close();
    };
  }, [room?.id, reconnectKey, room?.joined]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (friendRequestFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(friendRequestFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const showFriendRequestFeedback = (
    kind: "success" | "error",
    text: string,
  ) => {
    if (friendRequestFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(friendRequestFeedbackTimeoutRef.current);
    }

    setFriendRequestFeedback({ kind, text });
    friendRequestFeedbackTimeoutRef.current = window.setTimeout(() => {
      setFriendRequestFeedback(null);
      friendRequestFeedbackTimeoutRef.current = null;
    }, 4000);
  };

  const clearFriendRequestFeedback = () => {
    if (friendRequestFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(friendRequestFeedbackTimeoutRef.current);
      friendRequestFeedbackTimeoutRef.current = null;
    }
    setFriendRequestFeedback(null);
  };

  const fetchRoom = async (roomId: number, showPageLoader = true) => {
    try {
      if (showPageLoader) {
        setLoading(true);
      }

      setError(null);
      const roomData = await getRoomById(roomId);
      setRoom(roomData);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("You do not have permission to view this room");
        } else if (err.status === 404) {
          setError("Room not found");
        } else {
          setError(err.message || "Failed to load room");
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to load room");
      }
    } finally {
      if (showPageLoader) {
        setLoading(false);
      }
    }
  };

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
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueOlder = olderMessages.filter((m) => !existingIds.has(m.id));
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

  const handleJoin = async () => {
    if (!room) return;

    try {
      setActionLoading(true);
      setError(null);
      setMessagesError(null);

      await joinRoom(room.id);
      await fetchRoom(room.id, false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!room) return;

    try {
      setActionLoading(true);
      await leaveRoom(room.id);
      await fetchRoom(room.id, false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to leave room");
    } finally {
      setActionLoading(false);
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
        prev.map((m) => (m.id === updatedMessage.id ? updatedMessage : m)),
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
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err: unknown) {
      setMessagesError(
        err instanceof Error ? err.message : "Failed to delete message",
      );
    }
  };

  const loadBannedUsers = async (roomId: number) => {
    try {
      setBansLoading(true);
      const bans = await getRoomBannedUsers(roomId);
      setBannedUsers(bans);
    } catch (err: unknown) {
      setMessagesError(
        err instanceof Error ? err.message : "Failed to load banned users",
      );
    } finally {
      setBansLoading(false);
    }
  };

  const runModerationAction = async (
    loadingKey: string,
    action: () => Promise<unknown>,
  ) => {
    if (!room) {
      return;
    }

    try {
      setModerationActionLoadingKey(loadingKey);
      setMessagesError(null);
      await action();
      await fetchRoom(room.id, false);
      if (showBannedUsers) {
        await loadBannedUsers(room.id);
      }
      if (showMembers) {
        await loadRoomMembers(room.id);
      }
    } catch (err: unknown) {
      setMessagesError(
        err instanceof Error ? err.message : "Moderation failed",
      );
    } finally {
      setModerationActionLoadingKey(null);
    }
  };

  const handleBanMember = async (userId: number) => {
    if (!room) {
      return;
    }
    await runModerationAction(`ban-${userId}`, () =>
      banRoomMember(room.id, userId, "Banned by moderator"),
    );
  };

  const handleRemoveMember = async (userId: number) => {
    if (!room) {
      return;
    }
    await runModerationAction(`remove-${userId}`, () =>
      removeRoomMember(room.id, userId, "Removed and banned by moderator"),
    );
  };

  const handleToggleBannedUsers = async () => {
    if (!room) {
      return;
    }

    const next = !showBannedUsers;
    setShowBannedUsers(next);
    if (next) {
      await loadBannedUsers(room.id);
    }
  };

  const handleUnbanUser = async (userId: number) => {
    if (!room) {
      return;
    }
    await runModerationAction(`unban-${userId}`, () =>
      unbanRoomUser(room.id, userId),
    );
  };

  const handleDeleteRoom = async () => {
    if (!room) {
      return;
    }

    if (!window.confirm("Delete this room permanently?")) {
      return;
    }

    try {
      setModerationActionLoadingKey("delete-room");
      await deleteRoom(room.id);
      navigate("/rooms");
    } catch (err: unknown) {
      setMessagesError(
        err instanceof Error ? err.message : "Failed to delete room",
      );
      setModerationActionLoadingKey(null);
    }
  };

  const loadRoomMembers = async (roomId: number) => {
    try {
      setMembersLoading(true);
      const members = await getRoomMembers(roomId);
      setRoomMembers(members);
    } catch (err: unknown) {
      setMessagesError(
        err instanceof Error ? err.message : "Failed to load members",
      );
    } finally {
      setMembersLoading(false);
    }
  };

  const handleToggleMembers = async () => {
    if (!room) return;
    const next = !showMembers;
    setShowMembers(next);
    if (next) {
      await loadRoomMembers(room.id);
    }
  };

  const handleUpdateRole = async (userId: number, role: "admin" | "member") => {
    if (!room) return;
    await runModerationAction(`role-${userId}`, async () => {
      await updateMemberRole(room.id, userId, role);
      await loadRoomMembers(room.id);
    });
  };

  const handleInviteUser = async () => {
    if (!room) {
      return;
    }

    const username = inviteUsername.trim();
    if (!username) {
      setInviteError("Username is required.");
      return;
    }

    try {
      setInvitingUser(true);
      setInviteError(null);
      await invitePrivateRoomUser(room.id, username);
      setInviteUsername("");
      if (showMembers) {
        await loadRoomMembers(room.id);
      }
    } catch (err: unknown) {
      setInviteError(
        err instanceof Error ? err.message : "Failed to invite user",
      );
    } finally {
      setInvitingUser(false);
    }
  };

  const handlePendingAttachmentsChange = (files: FileList | null) => {
    if (!files || files.length === 0) {
      setPendingAttachments([]);
      return;
    }

    setPendingAttachments(Array.from(files));
  };

  const handleRemovePendingAttachment = (index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    if (!room) return;

    const trimmedContent = messageContent.trim();
    if (!trimmedContent) return;

    try {
      setSendingMessage(true);
      setMessagesError(null);
      const shouldUseRest =
        pendingAttachments.length > 0 ||
        !ws ||
        ws.readyState !== WebSocket.OPEN;

      if (!shouldUseRest && ws) {
        ws.send(
          JSON.stringify({
            action: "send_message",
            content: trimmedContent,
            reply_to: replyTo?.id ?? undefined,
          }),
        );
      } else {
        const newMessage = await sendMessage(room.id, {
          content: trimmedContent,
          reply_to: replyTo?.id ?? undefined,
        });

        let nextMessage = newMessage;
        if (pendingAttachments.length > 0) {
          setUploadingAttachments(true);
          const uploaded = await Promise.all(
            pendingAttachments.map((file) =>
              uploadMessageAttachment(newMessage.id, file),
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
      setReplyTo(null);
      clearFriendRequestFeedback();
    } catch (err: unknown) {
      setMessagesError(
        err instanceof Error ? err.message : "Failed to send message",
      );
    } finally {
      setSendingMessage(false);
      setUploadingAttachments;
      setSendingMessage(false);
    }
  };

  const handleSendFriendRequest = async (username: string, userId: number) => {
    const loadingKey = `request-${userId}`;
    const relationStatus = friendRelationByUserId[userId] ?? "none";

    if (
      friendRequestLoadingKey === loadingKey ||
      relationStatus === "outgoing"
    ) {
      showFriendRequestFeedback("error", "Friend request already sent");
      return;
    }

    if (relationStatus === "friend") {
      showFriendRequestFeedback("error", "You are already friends");
      return;
    }

    if (relationStatus === "incoming") {
      showFriendRequestFeedback("error", "You have a pending incoming request");
      return;
    }

    try {
      setFriendRequestLoadingKey(loadingKey);
      clearFriendRequestFeedback();
      await sendFriendRequestByUsername({ username });
      setFriendRelationByUserId((prev) => ({ ...prev, [userId]: "outgoing" }));
      showFriendRequestFeedback(
        "success",
        `Friend request sent to ${username}.`,
      );
    } catch (err: unknown) {
      const fallback = "Failed to send friend request";
      let message = err instanceof Error ? err.message : fallback;

      if (err instanceof ApiError && err.status === 400) {
        message = "Friend request already sent";

        const normalized =
          err.message?.toLowerCase() ??
          (err instanceof Error ? err.message.toLowerCase() : "");
        if (normalized.includes("already")) {
          setFriendRelationByUserId((prev) => ({
            ...prev,
            [userId]: "outgoing",
          }));
        }
      }

      showFriendRequestFeedback("error", message);
    } finally {
      setFriendRequestLoadingKey(null);
    }
  };

  const handleMessageChange = (value: string) => {
    setMessageContent(value);
    if (friendRequestFeedback) {
      clearFriendRequestFeedback();
    }
  };

  const handleReply = (message: Message) => {
    setReplyTo(message);
    if (friendRequestFeedback) {
      clearFriendRequestFeedback();
    }
  };

  const handleCancelReply = () => {
    setReplyTo(null);
    if (friendRequestFeedback) {
      clearFriendRequestFeedback();
    }
  };

  const handleBack = () => navigate("/rooms");

  if (loading) {
    return (
      <RoomDetailScaffold onBack={handleBack}>
        <LoadingState />
      </RoomDetailScaffold>
    );
  }

  if (error) {
    return (
      <RoomDetailScaffold onBack={handleBack}>
        <ErrorState message={error} />
      </RoomDetailScaffold>
    );
  }

  if (!room) {
    return (
      <RoomDetailScaffold onBack={handleBack}>
        <ErrorState message="Room not found" />
      </RoomDetailScaffold>
    );
  }

  const isModerator = room.my_role === "owner" || room.my_role === "admin";
  const isOwner = room.my_role === "owner";

  return (
    <RoomDetailScaffold onBack={handleBack}>
      <RoomDetailContent
        room={room}
        currentUserId={currentUserId}
        sidebarProps={{
          room,
          inviteUsername,
          invitingUser,
          inviteError,
          onInviteUsernameChange: setInviteUsername,
          onInviteUser: handleInviteUser,
          actionLoading,
          moderationActionLoadingKey,
          isModerator,
          isOwner,
          showBannedUsers,
          bannedUsers,
          bansLoading,
          onJoin: handleJoin,
          onLeave: handleLeave,
          onBack: handleBack,
          onToggleBannedUsers: handleToggleBannedUsers,
          onUnbanUser: handleUnbanUser,
          onDeleteRoom: handleDeleteRoom,
          roomMembers,
          showMembers,
          membersLoading,
          presenceByUserId,
          onToggleMembers: handleToggleMembers,
          onUpdateRole: handleUpdateRole,
        }}
        chatPanelProps={{
          room,
          messages,
          messagesLoading,
          messagesError,
          messageContent,
          onMessageChange: handleMessageChange,
          onSendMessage: handleSendMessage,
          pendingAttachments,
          onPendingAttachmentsChange: handlePendingAttachmentsChange,
          onRemovePendingAttachment: handleRemovePendingAttachment,
          uploadingAttachments,
          sendingMessage,
          replyTo,
          onReply: handleReply,
          onCancelReply: handleCancelReply,
          onLoadOlderMessages: handleLoadOlderMessages,
          loadingOlderMessages,
          hasMoreMessages: messagesHasMore,
          currentUserId,
          editingMessageId,
          editingMessageContent,
          onEditingMessageChange: setEditingMessageContent,
          onStartEdit: handleStartEdit,
          onCancelEdit: handleCancelEdit,
          onSaveEdit: handleSaveEdit,
          editingSaving,
          onDeleteMessage: handleDeleteMessage,
          onBanMember: handleBanMember,
          onRemoveMember: handleRemoveMember,
          moderationActionLoadingKey,
          friendRequestLoadingKey,
          friendRequestFeedback,
          friendRelationByUserId,
          onSendFriendRequest: handleSendFriendRequest,
          presenceByUserId,
          wsStatus,
        }}
      />
    </RoomDetailScaffold>
  );
}

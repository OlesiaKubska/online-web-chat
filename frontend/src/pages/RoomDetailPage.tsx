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
} from "../lib/api";

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

  const [messageContent, setMessageContent] = useState("");
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
  const [presenceByUserId, setPresenceByUserId] = useState<
    Record<number, UserPresenceStatus>
  >({});

  const isMountedRef = useRef(true);

  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);

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
    setWsStatus("disconnected");
  }, [room?.joined]);

  useEffect(() => {
    if (!room?.id || !room.joined) {
      return;
    }

    fetchMessages(room.id);
  }, [room?.id, room?.joined]);

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
    };
  }, []);

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

  const handleSendMessage = async () => {
    if (!room) return;

    const trimmedContent = messageContent.trim();
    if (!trimmedContent) return;

    try {
      setSendingMessage(true);
      setMessagesError(null);

      // Try to send via WebSocket if available
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            action: "send_message",
            content: trimmedContent,
            reply_to: replyTo?.id ?? undefined,
          }),
        );
        // Message will appear from WebSocket onmessage, not manually appended
      } else {
        // Fallback to REST if WebSocket not available
        const newMessage = await sendMessage(room.id, {
          content: trimmedContent,
          reply_to: replyTo?.id ?? undefined,
        });
        setMessages((prev) => [newMessage, ...prev]);
      }

      setMessageContent("");
      setReplyTo(null);
    } catch (err: unknown) {
      setMessagesError(
        err instanceof Error ? err.message : "Failed to send message",
      );
    } finally {
      setSendingMessage(false);
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
          onMessageChange: setMessageContent,
          onSendMessage: handleSendMessage,
          sendingMessage,
          replyTo,
          onReply: setReplyTo,
          onCancelReply: () => setReplyTo(null),
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
          presenceByUserId,
          wsStatus,
        }}
      />
    </RoomDetailScaffold>
  );
}

import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getRoomById,
  leaveRoom,
  joinRoom,
  getCurrentUser,
} from "../lib/roomsApi";
import {
  getRoomMessages,
  sendMessage,
  editMessage,
  deleteMessage,
} from "../lib/messagesApi";
import type { Room } from "../types/room";
import type { Message } from "../types/message";
import { LoadingState } from "../components/rooms/LoadingState";
import { ErrorState } from "../components/rooms/ErrorState";
import { PageShell } from "../components/rooms/PageShell";
import { TopBar } from "../components/rooms/TopBar";
import { RoomHero } from "../components/rooms/RoomHero";
import { RoomSidebar } from "../components/rooms/RoomSidebar";
import { ChatPanel } from "../components/rooms/ChatPanel";
import { ApiError } from "../lib/api";

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
  const isMountedRef = useRef(true);

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

  if (loading) {
    return (
      <PageShell>
        <TopBar onBack={() => navigate("/rooms")} />
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <LoadingState />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <TopBar onBack={() => navigate("/rooms")} />
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <ErrorState message={error} />
        </div>
      </PageShell>
    );
  }

  if (!room) {
    return (
      <PageShell>
        <TopBar onBack={() => navigate("/rooms")} />
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <ErrorState message="Room not found" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <TopBar onBack={() => navigate("/rooms")} />

        <RoomHero room={room} currentUserId={currentUserId} />

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "340px minmax(0, 1fr)",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <RoomSidebar
            room={room}
            actionLoading={actionLoading}
            onJoin={handleJoin}
            onLeave={handleLeave}
            onBack={() => navigate("/rooms")}
          />

          <main style={{ display: "grid", gap: "24px" }}>
            <ChatPanel
              room={room}
              messages={messages}
              messagesLoading={messagesLoading}
              messagesError={messagesError}
              messageContent={messageContent}
              onMessageChange={setMessageContent}
              onSendMessage={handleSendMessage}
              sendingMessage={sendingMessage}
              replyTo={replyTo}
              onReply={setReplyTo}
              onCancelReply={() => setReplyTo(null)}
              currentUserId={currentUserId}
              editingMessageId={editingMessageId}
              editingMessageContent={editingMessageContent}
              onEditingMessageChange={setEditingMessageContent}
              onStartEdit={handleStartEdit}
              onCancelEdit={handleCancelEdit}
              onSaveEdit={handleSaveEdit}
              editingSaving={editingSaving}
              onDeleteMessage={handleDeleteMessage}
              wsStatus={wsStatus}
            />
          </main>
        </div>
      </div>
    </PageShell>
  );
}

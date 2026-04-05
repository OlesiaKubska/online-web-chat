import { useEffect, useRef, useState } from "react";

import type { Message } from "../../types/message";
import type { Room } from "../../types/room";

type UseRoomWebSocketOptions = {
  room: Room | null;
  onMessageReceived: (message: Message) => void;
};

export function useRoomWebSocket({
  room,
  onMessageReceived,
}: UseRoomWebSocketOptions) {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [reconnectKey, setReconnectKey] = useState(0);
  const [wsStatus, setWsStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");

  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!room?.id) return;
    if (!room.joined) return;

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
          onMessageReceived(data.message);
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
  }, [room?.id, room?.joined, reconnectKey, onMessageReceived]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    ws,
    wsStatus,
  };
}

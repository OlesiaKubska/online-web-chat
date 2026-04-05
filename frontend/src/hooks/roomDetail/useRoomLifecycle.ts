import { useEffect, useState } from "react";

import { ApiError } from "../../lib/api";
import {
  getCurrentUser,
  getRoomById,
  joinRoom,
  leaveRoom,
} from "../../lib/roomsApi";
import type { Room } from "../../types/room";

export function useRoomLifecycle(roomId: number | null) {
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(roomId !== null);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);

  useEffect(() => {
    if (roomId === null) {
      setLoading(false);
      return;
    }

    void fetchRoom(roomId);
  }, [roomId]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getCurrentUser();
        setCurrentUserId(user.id);
      } catch {
        setCurrentUserId(null);
      }
    };

    void fetchUser();
  }, []);

  const fetchRoom = async (targetRoomId: number, showPageLoader = true) => {
    try {
      if (showPageLoader) {
        setLoading(true);
      }

      setError(null);
      const roomData = await getRoomById(targetRoomId);
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

  const handleJoin = async () => {
    if (!room) return;

    try {
      setActionLoading(true);
      setError(null);

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

  return {
    room,
    loading,
    error,
    setError,
    actionLoading,
    currentUserId,
    fetchRoom,
    handleJoin,
    handleLeave,
  };
}

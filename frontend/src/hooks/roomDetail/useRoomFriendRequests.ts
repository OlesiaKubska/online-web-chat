import { useEffect, useRef, useState } from "react";

import {
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  sendFriendRequestByUsername,
} from "../../lib/friendsApi";
import { ApiError } from "../../lib/api";
import type { Room } from "../../types/room";

type FriendRelationStatus = "none" | "friend" | "outgoing" | "incoming";

export function useRoomFriendRequests(room: Room | null) {
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

  const friendRequestFeedbackTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!room?.joined) {
      setFriendRelationByUserId({});
      return;
    }

    const loadFriendRelations = async () => {
      try {
        const [friends, incomingRequests, outgoingRequests] = await Promise.all([
          getFriends(),
          getIncomingFriendRequests(),
          getOutgoingFriendRequests(),
        ]);

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
    return () => {
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

  return {
    friendRequestLoadingKey,
    friendRequestFeedback,
    friendRelationByUserId,
    clearFriendRequestFeedback,
    handleSendFriendRequest,
  };
}

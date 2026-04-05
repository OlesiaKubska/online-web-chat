import { useEffect, useState } from "react";

import { getUsersPresence, type UserPresenceStatus } from "../../lib/api";
import type { Message } from "../../types/message";
import type { Room, RoomMember } from "../../types/room";

const PRESENCE_REFRESH_INTERVAL_MS = 2000;

type UseRoomPresenceOptions = {
  room: Room | null;
  messages: Message[];
  roomMembers: RoomMember[];
};

export function useRoomPresence({
  room,
  messages,
  roomMembers,
}: UseRoomPresenceOptions) {
  const [presenceByUserId, setPresenceByUserId] = useState<
    Record<number, UserPresenceStatus>
  >({});

  const userIds = Array.from(
    new Set([
      ...messages.map((message) => message.user),
      ...roomMembers.map((member) => member.user_id),
    ]),
  );

  useEffect(() => {
    if (!room?.id || !room.joined || userIds.length === 0) {
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
    }, PRESENCE_REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [room?.id, room?.joined, userIds]);

  return {
    presenceByUserId:
      !room?.id || !room.joined || userIds.length === 0 ? {} : presenceByUserId,
  };
}

import { useState } from "react";
import type { NavigateFunction } from "react-router-dom";

import {
  banRoomMember,
  deleteRoom,
  getRoomBannedUsers,
  getRoomMembers,
  invitePrivateRoomUser,
  removeRoomMember,
  unbanRoomUser,
  updateMemberRole,
} from "../../lib/roomsApi";
import type { Room, RoomBan, RoomMember } from "../../types/room";

type UseRoomModerationOptions = {
  room: Room | null;
  navigate: NavigateFunction;
  fetchRoom: (roomId: number, showPageLoader?: boolean) => Promise<void>;
  setMessagesError: (value: string | null) => void;
};

export function useRoomModeration({
  room,
  navigate,
  fetchRoom,
  setMessagesError,
}: UseRoomModerationOptions) {
  const [bannedUsers, setBannedUsers] = useState<RoomBan[]>([]);
  const [showBannedUsers, setShowBannedUsers] = useState(false);
  const [bansLoading, setBansLoading] = useState(false);
  const [moderationActionLoadingKey, setModerationActionLoadingKey] = useState<
    string | null
  >(null);

  const [roomMembers, setRoomMembers] = useState<RoomMember[]>([]);
  const [showMembers, setShowMembers] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [invitingUser, setInvitingUser] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

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

  return {
    bannedUsers,
    showBannedUsers,
    bansLoading,
    moderationActionLoadingKey,
    roomMembers,
    showMembers,
    membersLoading,
    inviteUsername,
    setInviteUsername,
    invitingUser,
    inviteError,
    handleBanMember,
    handleRemoveMember,
    handleToggleBannedUsers,
    handleUnbanUser,
    handleDeleteRoom,
    handleToggleMembers,
    handleUpdateRole,
    handleInviteUser,
  };
}

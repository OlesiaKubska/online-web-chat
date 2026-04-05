import { useEffect, useState } from "react";
import type { Room, RoomBan, RoomMember } from "../../types/room";
import type { UserPresenceStatus } from "../../lib/api";
import {
  palette,
  primaryButtonStyle,
  secondaryButtonStyle,
  dangerButtonStyle,
  panelTitleStyle,
} from "../../styles/roomsTheme";
import { Panel } from "./Panel";
import { InfoRow } from "./InfoRow";
import { PresenceBadge } from "./PresenceBadge";

interface RoomSidebarProps {
  room: Room;
  inviteUsername: string;
  invitingUser: boolean;
  inviteError: string | null;
  onInviteUsernameChange: (value: string) => void;
  onInviteUser: () => void;
  actionLoading: boolean;
  moderationActionLoadingKey: string | null;
  isModerator: boolean;
  isOwner: boolean;
  showBannedUsers: boolean;
  bannedUsers: RoomBan[];
  bansLoading: boolean;
  roomMembers: RoomMember[];
  showMembers: boolean;
  membersLoading: boolean;
  presenceByUserId: Record<number, UserPresenceStatus>;
  onJoin: () => void;
  onLeave: () => void;
  onBack: () => void;
  onToggleBannedUsers: () => void;
  onUnbanUser: (userId: number) => void;
  onDeleteRoom: () => void;
  onToggleMembers: () => void;
  onUpdateRole: (userId: number, role: "admin" | "member") => void;
}

export function RoomSidebar({
  room,
  inviteUsername,
  invitingUser,
  inviteError,
  onInviteUsernameChange,
  onInviteUser,
  actionLoading,
  moderationActionLoadingKey,
  isModerator,
  isOwner,
  showBannedUsers,
  bannedUsers,
  bansLoading,
  roomMembers,
  showMembers,
  membersLoading,
  presenceByUserId,
  onJoin,
  onLeave,
  onBack,
  onToggleBannedUsers,
  onUnbanUser,
  onDeleteRoom,
  onToggleMembers,
  onUpdateRole,
}: RoomSidebarProps) {
  const [showRoomDetails, setShowRoomDetails] = useState(!room.joined);
  const canViewMembers = room.joined && !room.is_direct;
  const canManageRoom = isModerator && !room.is_direct;

  useEffect(() => {
    setShowRoomDetails(!room.joined);
  }, [room.joined]);

  return (
    <aside
      style={{
        position: "sticky",
        top: "20px",
        display: "grid",
        gap: "20px",
      }}
    >
      <Panel>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: "12px",
            alignItems: "center",
            marginBottom: showRoomDetails ? "16px" : 0,
          }}
        >
          <h2 style={{ ...panelTitleStyle, marginBottom: 0 }}>Room details</h2>
          <button
            type="button"
            onClick={() => setShowRoomDetails((current) => !current)}
            style={{
              ...secondaryButtonStyle,
              minWidth: "auto",
              padding: "6px 10px",
              fontSize: "12px",
            }}
          >
            {showRoomDetails ? "Collapse" : "Expand"}
          </button>
        </div>

        {showRoomDetails ? (
          <div style={{ display: "grid", gap: "12px" }}>
            <InfoRow label="Owner" value={room.owner_username} />
            <InfoRow
              label="Your role"
              value={room.my_role ? room.my_role : "Not a member"}
            />
            <InfoRow
              label="Created"
              value={new Date(room.created_at).toLocaleDateString()}
            />
            <InfoRow
              label="Visibility"
              value={room.visibility}
              tone={room.visibility === "public" ? "success" : "danger"}
            />
          </div>
        ) : null}
      </Panel>

      <Panel>
        <h2 style={panelTitleStyle}>Actions</h2>

        <div style={{ display: "grid", gap: "12px" }}>
          {room.visibility === "public" && !room.joined && (
            <button
              onClick={onJoin}
              disabled={actionLoading}
              style={{
                ...primaryButtonStyle,
                opacity: actionLoading ? 0.7 : 1,
                cursor: actionLoading ? "not-allowed" : "pointer",
              }}
            >
              {actionLoading ? "Joining..." : "Join room"}
            </button>
          )}

          {room.joined && room.my_role !== "owner" && (
            <button
              onClick={onLeave}
              disabled={actionLoading}
              style={{
                ...dangerButtonStyle,
                opacity: actionLoading ? 0.7 : 1,
                cursor: actionLoading ? "not-allowed" : "pointer",
              }}
            >
              {actionLoading ? "Leaving..." : "Leave room"}
            </button>
          )}

          {room.my_role === "owner" && (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: "14px",
                border: `1px solid ${palette.border}`,
                backgroundColor: palette.cardSoft,
                color: palette.textMuted,
                fontSize: "14px",
                lineHeight: 1.5,
              }}
            >
              Owner cannot leave own room.
            </div>
          )}

          {canManageRoom && (
            <button
              onClick={onToggleBannedUsers}
              style={{
                ...secondaryButtonStyle,
                backgroundColor: palette.cardSoft,
              }}
            >
              {showBannedUsers ? "Hide banned users" : "Show banned users"}
            </button>
          )}

          {canViewMembers && (
            <button
              onClick={onToggleMembers}
              style={{
                ...secondaryButtonStyle,
                backgroundColor: palette.cardSoft,
              }}
            >
              {showMembers ? "Hide members" : "Show members"}
            </button>
          )}

          {isOwner && !room.is_direct && (
            <button
              onClick={onDeleteRoom}
              disabled={moderationActionLoadingKey === "delete-room"}
              style={{
                ...dangerButtonStyle,
                opacity: moderationActionLoadingKey === "delete-room" ? 0.7 : 1,
                cursor:
                  moderationActionLoadingKey === "delete-room"
                    ? "not-allowed"
                    : "pointer",
              }}
            >
              {moderationActionLoadingKey === "delete-room"
                ? "Deleting..."
                : "Delete room"}
            </button>
          )}

          <button onClick={onBack} style={secondaryButtonStyle}>
            Back to rooms
          </button>
        </div>
      </Panel>

      {isModerator && !room.is_direct && showBannedUsers && (
        <Panel>
          <h2 style={panelTitleStyle}>Banned users</h2>

          {bansLoading ? (
            <div style={{ color: palette.textMuted, fontSize: "14px" }}>
              Loading banned users...
            </div>
          ) : bannedUsers.length === 0 ? (
            <div style={{ color: palette.textMuted, fontSize: "14px" }}>
              No banned users.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {bannedUsers.map((ban) => (
                <div
                  key={ban.id}
                  style={{
                    border: `1px solid ${palette.border}`,
                    borderRadius: "12px",
                    padding: "10px",
                    backgroundColor: palette.cardSoft,
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{ban.banned_username}</div>
                  {ban.reason ? (
                    <div
                      style={{
                        color: palette.textMuted,
                        fontSize: "13px",
                        marginTop: "6px",
                      }}
                    >
                      {ban.reason}
                    </div>
                  ) : null}

                  <button
                    onClick={() => onUnbanUser(ban.banned_user)}
                    disabled={
                      moderationActionLoadingKey === `unban-${ban.banned_user}`
                    }
                    style={{
                      ...secondaryButtonStyle,
                      marginTop: "10px",
                      width: "100%",
                      opacity:
                        moderationActionLoadingKey ===
                        `unban-${ban.banned_user}`
                          ? 0.7
                          : 1,
                    }}
                  >
                    {moderationActionLoadingKey === `unban-${ban.banned_user}`
                      ? "Unbanning..."
                      : "Unban"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {canViewMembers && showMembers && (
        <Panel>
          <h2 style={panelTitleStyle}>Members</h2>

          {membersLoading ? (
            <div style={{ color: palette.textMuted, fontSize: "14px" }}>
              Loading members...
            </div>
          ) : roomMembers.length === 0 ? (
            <div style={{ color: palette.textMuted, fontSize: "14px" }}>
              No members.
            </div>
          ) : (
            <div style={{ display: "grid", gap: "10px" }}>
              {roomMembers.map((member) => {
                const loading =
                  moderationActionLoadingKey === `role-${member.user_id}`;
                const canPromote = isOwner && member.role === "member";
                const canDemote = member.role === "admin";

                return (
                  <div
                    key={member.id}
                    style={{
                      border: `1px solid ${palette.border}`,
                      borderRadius: "12px",
                      padding: "10px",
                      backgroundColor: palette.cardSoft,
                      display: "grid",
                      gap: "8px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "8px",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ fontWeight: 700 }}>{member.username}</div>
                        <PresenceBadge
                          status={presenceByUserId[member.user_id]}
                        />
                      </div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: palette.textMuted,
                          textTransform: "uppercase",
                        }}
                      >
                        {member.role}
                      </div>
                    </div>

                    {canPromote && (
                      <button
                        onClick={() => onUpdateRole(member.user_id, "admin")}
                        disabled={loading}
                        style={{
                          ...secondaryButtonStyle,
                          width: "100%",
                          opacity: loading ? 0.7 : 1,
                        }}
                      >
                        {loading ? "Updating..." : "Promote to admin"}
                      </button>
                    )}

                    {canDemote && (
                      <button
                        onClick={() => onUpdateRole(member.user_id, "member")}
                        disabled={loading}
                        style={{
                          ...secondaryButtonStyle,
                          width: "100%",
                          opacity: loading ? 0.7 : 1,
                        }}
                      >
                        {loading ? "Updating..." : "Demote to member"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {room.visibility === "private" && room.joined && !room.is_direct && (
        <Panel>
          <h2 style={panelTitleStyle}>Invite user</h2>
          <div style={{ display: "grid", gap: "10px" }}>
            <input
              type="text"
              value={inviteUsername}
              onChange={(event) => onInviteUsernameChange(event.target.value)}
              placeholder="Enter username"
              style={{
                width: "100%",
                borderRadius: "12px",
                border: `1px solid ${palette.border}`,
                backgroundColor: palette.cardSoft,
                color: palette.text,
                padding: "10px 12px",
                fontSize: "14px",
              }}
            />
            <button
              onClick={onInviteUser}
              disabled={invitingUser}
              style={{
                ...secondaryButtonStyle,
                width: "100%",
                opacity: invitingUser ? 0.7 : 1,
                cursor: invitingUser ? "not-allowed" : "pointer",
              }}
            >
              {invitingUser ? "Inviting..." : "Invite to room"}
            </button>
            {inviteError && (
              <div
                style={{
                  color: palette.danger,
                  fontSize: "13px",
                  lineHeight: 1.4,
                }}
              >
                {inviteError}
              </div>
            )}
          </div>
        </Panel>
      )}
    </aside>
  );
}

import type { Room, RoomBan, RoomMember } from "../../types/room";
import {
  palette,
  primaryButtonStyle,
  secondaryButtonStyle,
  dangerButtonStyle,
  panelTitleStyle,
} from "../../styles/roomsTheme";
import { Panel } from "./Panel";
import { InfoRow } from "./InfoRow";

interface RoomSidebarProps {
  room: Room;
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
  onJoin,
  onLeave,
  onBack,
  onToggleBannedUsers,
  onUnbanUser,
  onDeleteRoom,
  onToggleMembers,
  onUpdateRole,
}: RoomSidebarProps) {
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
        <h2 style={panelTitleStyle}>Room details</h2>
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

          {isModerator && !room.is_direct && (
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

          {isOwner && !room.is_direct && (
            <button
              onClick={onToggleMembers}
              style={{
                ...secondaryButtonStyle,
                backgroundColor: palette.cardSoft,
              }}
            >
              {showMembers ? "Hide members" : "Manage admins"}
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

      {isOwner && !room.is_direct && showMembers && (
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
                const canPromote = member.role === "member";
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
                      <div style={{ fontWeight: 700 }}>{member.username}</div>
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
    </aside>
  );
}

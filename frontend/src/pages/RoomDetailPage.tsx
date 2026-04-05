import { useNavigate, useParams } from "react-router-dom";

import { ErrorState } from "../components/rooms/ErrorState";
import { LoadingState } from "../components/rooms/LoadingState";
import { RoomDetailContent } from "../components/rooms/RoomDetailContent";
import { RoomDetailScaffold } from "../components/rooms/RoomDetailScaffold";
import { useRoomFriendRequests } from "../hooks/roomDetail/useRoomFriendRequests";
import { useRoomLifecycle } from "../hooks/roomDetail/useRoomLifecycle";
import { useRoomMessages } from "../hooks/roomDetail/useRoomMessages";
import { useRoomModeration } from "../hooks/roomDetail/useRoomModeration";
import { useRoomPresence } from "../hooks/roomDetail/useRoomPresence";
import { useRoomWebSocket } from "../hooks/roomDetail/useRoomWebSocket";

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  let roomId: number | null = null;
  let routeError: string | null = null;

  if (!id) {
    routeError = "Invalid room ID";
  } else {
    const parsedRoomId = parseInt(id, 10);
    if (isNaN(parsedRoomId)) {
      routeError = "Invalid room ID";
    } else {
      roomId = parsedRoomId;
    }
  }

  const roomState = useRoomLifecycle(roomId);
  const friendRequests = useRoomFriendRequests(roomState.room);
  const messages = useRoomMessages({
    room: roomState.room,
    clearFriendRequestFeedback: friendRequests.clearFriendRequestFeedback,
  });
  const websocket = useRoomWebSocket({
    room: roomState.room,
    onMessageReceived: messages.handleIncomingMessage,
  });
  const moderation = useRoomModeration({
    room: roomState.room,
    navigate,
    fetchRoom: roomState.fetchRoom,
    setMessagesError: messages.setMessagesError,
  });
  const presence = useRoomPresence({
    room: roomState.room,
    messages: messages.messages,
    roomMembers: moderation.roomMembers,
  });

  const handleBack = () => navigate("/rooms");

  const handleJoin = async () => {
    messages.setMessagesError(null);
    await roomState.handleJoin();
  };

  const error = routeError ?? roomState.error;

  if (roomState.loading && !routeError) {
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

  if (!roomState.room) {
    return (
      <RoomDetailScaffold onBack={handleBack}>
        <ErrorState message="Room not found" />
      </RoomDetailScaffold>
    );
  }

  const room = roomState.room;
  const isModerator = room.my_role === "owner" || room.my_role === "admin";
  const isOwner = room.my_role === "owner";

  return (
    <RoomDetailScaffold onBack={handleBack}>
      <RoomDetailContent
        room={room}
        currentUserId={roomState.currentUserId}
        sidebarProps={{
          room,
          inviteUsername: moderation.inviteUsername,
          invitingUser: moderation.invitingUser,
          inviteError: moderation.inviteError,
          onInviteUsernameChange: moderation.setInviteUsername,
          onInviteUser: moderation.handleInviteUser,
          actionLoading: roomState.actionLoading,
          moderationActionLoadingKey: moderation.moderationActionLoadingKey,
          isModerator,
          isOwner,
          showBannedUsers: moderation.showBannedUsers,
          bannedUsers: moderation.bannedUsers,
          bansLoading: moderation.bansLoading,
          onJoin: handleJoin,
          onLeave: roomState.handleLeave,
          onBack: handleBack,
          onToggleBannedUsers: moderation.handleToggleBannedUsers,
          onUnbanUser: moderation.handleUnbanUser,
          onDeleteRoom: moderation.handleDeleteRoom,
          roomMembers: moderation.roomMembers,
          showMembers: moderation.showMembers,
          membersLoading: moderation.membersLoading,
          presenceByUserId: presence.presenceByUserId,
          onToggleMembers: moderation.handleToggleMembers,
          onUpdateRole: moderation.handleUpdateRole,
        }}
        chatPanelProps={{
          room,
          messages: messages.messages,
          messagesLoading: messages.messagesLoading,
          messagesError: messages.messagesError,
          messageContent: messages.messageContent,
          onMessageChange: messages.handleMessageChange,
          onSendMessage: () => messages.handleSendMessage(websocket.ws),
          pendingAttachments: messages.pendingAttachments,
          onPendingAttachmentsChange: messages.handlePendingAttachmentsChange,
          attachmentComment: messages.attachmentComment,
          onAttachmentCommentChange: messages.setAttachmentComment,
          onComposerPaste: messages.handleComposerPaste,
          onRemovePendingAttachment: messages.handleRemovePendingAttachment,
          uploadingAttachments: messages.uploadingAttachments,
          sendingMessage: messages.sendingMessage,
          replyTo: messages.replyTo,
          onReply: messages.handleReply,
          onCancelReply: messages.handleCancelReply,
          onLoadOlderMessages: messages.handleLoadOlderMessages,
          loadingOlderMessages: messages.loadingOlderMessages,
          hasMoreMessages: messages.messagesHasMore,
          currentUserId: roomState.currentUserId,
          editingMessageId: messages.editingMessageId,
          editingMessageContent: messages.editingMessageContent,
          onEditingMessageChange: messages.setEditingMessageContent,
          onStartEdit: messages.handleStartEdit,
          onCancelEdit: messages.handleCancelEdit,
          onSaveEdit: messages.handleSaveEdit,
          editingSaving: messages.editingSaving,
          onDeleteMessage: messages.handleDeleteMessage,
          onBanMember: moderation.handleBanMember,
          onRemoveMember: moderation.handleRemoveMember,
          moderationActionLoadingKey: moderation.moderationActionLoadingKey,
          friendRequestLoadingKey: friendRequests.friendRequestLoadingKey,
          friendRequestFeedback: friendRequests.friendRequestFeedback,
          friendRelationByUserId: friendRequests.friendRelationByUserId,
          onSendFriendRequest: friendRequests.handleSendFriendRequest,
          presenceByUserId: presence.presenceByUserId,
          wsStatus: websocket.wsStatus,
        }}
      />
    </RoomDetailScaffold>
  );
}

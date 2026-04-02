import { useRef, useEffect } from "react";
import type { UserPresenceStatus } from "../../lib/api";
import type { Room } from "../../types/room";
import type { Message } from "../../types/message";
import {
  palette,
  inputStyle,
  secondaryButtonStyle,
} from "../../styles/roomsTheme";
import { Panel } from "./Panel";
import { MetaPill } from "./MetaPill";
import { PresenceBadge } from "./PresenceBadge";

type FriendRelationStatus = "none" | "friend" | "outgoing" | "incoming";

interface ChatPanelProps {
  room: Room;
  messages: Message[];
  messagesLoading: boolean;
  messagesError: string | null;
  messageContent: string;
  onMessageChange: (content: string) => void;
  onSendMessage: () => void;
  pendingAttachments: File[];
  onPendingAttachmentsChange: (files: FileList | null) => void;
  onRemovePendingAttachment: (index: number) => void;
  uploadingAttachments: boolean;
  sendingMessage: boolean;
  replyTo: Message | null;
  onReply: (message: Message) => void;
  onCancelReply: () => void;
  onLoadOlderMessages: () => void;
  loadingOlderMessages: boolean;
  hasMoreMessages: boolean;
  currentUserId: number | null;
  editingMessageId: number | null;
  editingMessageContent: string;
  onEditingMessageChange: (content: string) => void;
  onStartEdit: (message: Message) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  editingSaving: boolean;
  onDeleteMessage: (messageId: number) => void;
  onBanMember: (userId: number) => void;
  onRemoveMember: (userId: number) => void;
  moderationActionLoadingKey: string | null;
  friendRequestLoadingKey: string | null;
  friendRequestFeedback: {
    kind: "success" | "error";
    text: string;
  } | null;
  friendRelationByUserId: Record<number, FriendRelationStatus>;
  onSendFriendRequest: (username: string, userId: number) => void;
  presenceByUserId: Record<number, UserPresenceStatus>;
  wsStatus: "connecting" | "connected" | "disconnected";
}

export function ChatPanel({
  room,
  messages,
  messagesLoading,
  messagesError,
  messageContent,
  onMessageChange,
  onSendMessage,
  pendingAttachments,
  onPendingAttachmentsChange,
  onRemovePendingAttachment,
  uploadingAttachments,
  sendingMessage,
  replyTo,
  onReply,
  onCancelReply,
  onLoadOlderMessages,
  loadingOlderMessages,
  hasMoreMessages,
  currentUserId,
  editingMessageId,
  editingMessageContent,
  onEditingMessageChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  editingSaving,
  onDeleteMessage,
  onBanMember,
  onRemoveMember,
  moderationActionLoadingKey,
  friendRequestLoadingKey,
  friendRequestFeedback,
  friendRelationByUserId,
  onSendFriendRequest,
  presenceByUserId,
  wsStatus,
}: ChatPanelProps) {
  const orderedMessages = [...messages].reverse();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const olderMessagesSentinelRef = useRef<HTMLDivElement | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);
  const canModerateRoom =
    !room.is_direct && (room.my_role === "owner" || room.my_role === "admin");

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user is near bottom (within 120px)
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      120;

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    const sentinel = olderMessagesSentinelRef.current;
    if (
      !sentinel ||
      !hasMoreMessages ||
      loadingOlderMessages ||
      messagesLoading
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadOlderMessages();
        }
      },
      {
        root: null,
        threshold: 0.1,
      },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    hasMoreMessages,
    loadingOlderMessages,
    messagesLoading,
    onLoadOlderMessages,
  ]);

  return (
    <Panel>
      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "26px", color: palette.text }}>
            Chat
          </h2>
          <p
            style={{
              margin: "8px 0 0",
              color: palette.textMuted,
              fontSize: "14px",
            }}
          >
            {messages.length} {messages.length === 1 ? "message" : "messages"}
          </p>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <MetaPill
            tone={
              wsStatus === "connected"
                ? "success"
                : wsStatus === "connecting"
                  ? "default"
                  : "danger"
            }
          >
            {wsStatus === "connected"
              ? "Live"
              : wsStatus === "connecting"
                ? "Connecting..."
                : "Offline"}
          </MetaPill>

          <MetaPill tone={room.joined ? "success" : "default"}>
            {room.joined ? "Ready to chat" : "Join to participate"}
          </MetaPill>
        </div>
      </div>

      <div
        style={{
          minHeight: "360px",
          borderRadius: "22px",
          border: `1px dashed ${palette.border}`,
          background: `linear-gradient(180deg, ${palette.cardSoft} 0%, ${palette.cardBg} 100%)`,
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        {friendRequestFeedback && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              border: `1px solid ${
                friendRequestFeedback.kind === "error"
                  ? palette.danger
                  : palette.secondary
              }`,
              backgroundColor:
                friendRequestFeedback.kind === "error"
                  ? "rgba(220, 53, 69, 0.1)"
                  : "rgba(34, 199, 169, 0.1)",
              color:
                friendRequestFeedback.kind === "error"
                  ? palette.danger
                  : palette.textSoft,
              fontSize: "14px",
            }}
          >
            {friendRequestFeedback.text}
          </div>
        )}
        {replyTo && (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: "10px",
              backgroundColor: "rgba(34, 199, 169, 0.1)",
              border: `1px solid ${palette.secondary}`,
              color: palette.textSoft,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <div>
              Replying to <strong>{replyTo.user_username}</strong>:
              <div
                style={{
                  marginTop: "4px",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.4,
                }}
              >
                {replyTo.content.length > 120
                  ? `${replyTo.content.substring(0, 120)}...`
                  : replyTo.content}
              </div>
            </div>
            <button
              type="button"
              onClick={onCancelReply}
              style={{
                ...secondaryButtonStyle,
                minWidth: "auto",
                padding: "6px 10px",
                opacity: 0.8,
              }}
            >
              Cancel
            </button>
          </div>
        )}
        {messagesLoading && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "32px 16px",
              color: palette.textMuted,
            }}
          >
            <div style={{ fontSize: "14px" }}>Loading messages...</div>
          </div>
        )}
        {messagesError && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              padding: "32px 16px",
              color: palette.danger,
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 600 }}>
              Failed to load messages
            </div>
            <div style={{ fontSize: "14px", opacity: 0.8 }}>
              {messagesError}
            </div>
          </div>
        )}
        {!messagesLoading && !messagesError && messages.length === 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              padding: "48px 16px",
              color: palette.textMuted,
              textAlign: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  marginBottom: "8px",
                }}
              >
                No messages yet
              </div>
              <div style={{ fontSize: "14px", opacity: 0.8 }}>
                {room.joined
                  ? "Start the conversation by sending the first message!"
                  : "Join the room to start chatting with others."}
              </div>
            </div>
          </div>
        )}
        {!messagesLoading && !messagesError && messages.length > 0 && (
          <div
            ref={messagesContainerRef}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div ref={olderMessagesSentinelRef} style={{ height: "1px" }} />
            {loadingOlderMessages && (
              <div
                style={{
                  textAlign: "center",
                  color: palette.textMuted,
                  fontSize: "13px",
                }}
              >
                Loading older messages...
              </div>
            )}
            {orderedMessages.map((message) => (
              <div
                key={message.id}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  backgroundColor: palette.cardSoft,
                  border: `1px solid ${palette.border}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    gap: "8px",
                    marginBottom: "8px",
                  }}
                >
                  {(() => {
                    const relationStatus =
                      friendRelationByUserId[message.user] ?? "none";
                    const isRequestLoading =
                      friendRequestLoadingKey === `request-${message.user}`;
                    const isActionDisabled =
                      isRequestLoading ||
                      relationStatus === "friend" ||
                      relationStatus === "outgoing" ||
                      relationStatus === "incoming";

                    const friendActionLabel = isRequestLoading
                      ? "Sending request..."
                      : relationStatus === "friend"
                        ? "Friend"
                        : relationStatus === "outgoing"
                          ? "Request sent"
                          : relationStatus === "incoming"
                            ? "Respond"
                            : "Add friend";

                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => onReply(message)}
                          disabled={!room.joined}
                          style={{
                            ...secondaryButtonStyle,
                            fontSize: "12px",
                            padding: "4px 8px",
                            minWidth: "auto",
                            opacity: !room.joined ? 0.6 : 1,
                            cursor: !room.joined ? "not-allowed" : "pointer",
                          }}
                        >
                          Reply
                        </button>
                        {currentUserId === message.user && (
                          <button
                            type="button"
                            onClick={() => onStartEdit(message)}
                            disabled={
                              editingMessageId !== null &&
                              editingMessageId !== message.id
                            }
                            style={{
                              ...secondaryButtonStyle,
                              fontSize: "12px",
                              padding: "4px 8px",
                              minWidth: "auto",
                              opacity:
                                editingMessageId !== null &&
                                editingMessageId !== message.id
                                  ? 0.6
                                  : 1,
                              cursor:
                                editingMessageId !== null &&
                                editingMessageId !== message.id
                                  ? "not-allowed"
                                  : "pointer",
                            }}
                          >
                            Edit
                          </button>
                        )}
                        {(currentUserId === message.user ||
                          canModerateRoom) && (
                          <button
                            type="button"
                            onClick={() => onDeleteMessage(message.id)}
                            disabled={
                              editingMessageId !== null &&
                              editingMessageId !== message.id
                            }
                            style={{
                              ...secondaryButtonStyle,
                              fontSize: "12px",
                              padding: "4px 8px",
                              minWidth: "auto",
                              opacity:
                                editingMessageId !== null &&
                                editingMessageId !== message.id
                                  ? 0.6
                                  : 1,
                              cursor:
                                editingMessageId !== null &&
                                editingMessageId !== message.id
                                  ? "not-allowed"
                                  : "pointer",
                              backgroundColor: "rgba(220, 53, 69, 0.1)",
                              borderColor: palette.danger,
                              color: palette.danger,
                            }}
                          >
                            {currentUserId === message.user
                              ? "Delete"
                              : "Mod delete"}
                          </button>
                        )}

                        {canModerateRoom &&
                          currentUserId !== null &&
                          currentUserId !== message.user &&
                          !room.is_direct && (
                            <>
                              <button
                                type="button"
                                onClick={() => onRemoveMember(message.user)}
                                disabled={
                                  moderationActionLoadingKey ===
                                  `remove-${message.user}`
                                }
                                style={{
                                  ...secondaryButtonStyle,
                                  fontSize: "12px",
                                  padding: "4px 8px",
                                  minWidth: "auto",
                                  opacity:
                                    moderationActionLoadingKey ===
                                    `remove-${message.user}`
                                      ? 0.6
                                      : 1,
                                }}
                              >
                                {moderationActionLoadingKey ===
                                `remove-${message.user}`
                                  ? "Removing & banning..."
                                  : "Remove & ban"}
                              </button>

                              <button
                                type="button"
                                onClick={() => onBanMember(message.user)}
                                disabled={
                                  moderationActionLoadingKey ===
                                  `ban-${message.user}`
                                }
                                style={{
                                  ...secondaryButtonStyle,
                                  fontSize: "12px",
                                  padding: "4px 8px",
                                  minWidth: "auto",
                                  opacity:
                                    moderationActionLoadingKey ===
                                    `ban-${message.user}`
                                      ? 0.6
                                      : 1,
                                  backgroundColor: "rgba(220, 53, 69, 0.1)",
                                  borderColor: palette.danger,
                                  color: palette.danger,
                                }}
                              >
                                {moderationActionLoadingKey ===
                                `ban-${message.user}`
                                  ? "Banning..."
                                  : "Ban member"}
                              </button>
                            </>
                          )}

                        {!room.is_direct &&
                          currentUserId !== null &&
                          currentUserId !== message.user && (
                            <button
                              type="button"
                              onClick={() =>
                                onSendFriendRequest(
                                  message.user_username,
                                  message.user,
                                )
                              }
                              disabled={isActionDisabled}
                              style={{
                                ...secondaryButtonStyle,
                                fontSize: "12px",
                                padding: "4px 8px",
                                minWidth: "auto",
                                opacity: isActionDisabled ? 0.6 : 1,
                              }}
                            >
                              {friendActionLabel}
                            </button>
                          )}
                      </>
                    );
                  })()}
                </div>
                {message.reply_to_message && (
                  <div
                    style={{
                      marginBottom: "8px",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(0,0,0,0.2)",
                      borderLeft: `3px solid ${palette.secondary}`,
                      fontSize: "14px",
                      color: palette.textSoft,
                    }}
                  >
                    <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                      Replying to {message.reply_to_message.user_username}
                    </div>
                    <div
                      style={{
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.4,
                      }}
                    >
                      {message.reply_to_message.content.length > 100
                        ? `${message.reply_to_message.content.substring(0, 100)}...`
                        : message.reply_to_message.content}
                    </div>
                  </div>
                )}
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "8px",
                    marginBottom: "4px",
                  }}
                >
                  <span style={{ fontWeight: 600, color: palette.text }}>
                    {message.user_username}
                  </span>
                  <PresenceBadge status={presenceByUserId[message.user]} />
                  <span
                    style={{
                      fontSize: "12px",
                      color: palette.textMuted,
                    }}
                  >
                    {new Date(message.created_at).toLocaleString()}
                  </span>
                  {message.edited && (
                    <span
                      style={{
                        fontSize: "12px",
                        color: palette.textMuted,
                        fontStyle: "italic",
                      }}
                    >
                      (edited)
                    </span>
                  )}
                </div>
                {editingMessageId === message.id ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <textarea
                      value={editingMessageContent}
                      onChange={(e) => onEditingMessageChange(e.target.value)}
                      rows={3}
                      style={{
                        ...inputStyle,
                        minHeight: "90px",
                        resize: "vertical",
                      }}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        type="button"
                        onClick={onSaveEdit}
                        disabled={
                          !editingMessageContent.trim() || editingSaving
                        }
                        style={{
                          ...secondaryButtonStyle,
                          minWidth: "80px",
                          opacity:
                            !editingMessageContent.trim() || editingSaving
                              ? 0.6
                              : 1,
                          cursor:
                            !editingMessageContent.trim() || editingSaving
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {editingSaving ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={onCancelEdit}
                        disabled={editingSaving}
                        style={{
                          ...secondaryButtonStyle,
                          minWidth: "80px",
                          opacity: editingSaving ? 0.6 : 1,
                          cursor: editingSaving ? "not-allowed" : "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div
                      style={{
                        color: palette.textSoft,
                        whiteSpace: "pre-wrap",
                        lineHeight: 1.5,
                      }}
                    >
                      {message.content}
                    </div>

                    {message.attachments?.length > 0 && (
                      <div
                        style={{
                          marginTop: "10px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {message.attachments.map((att) => {
                          const isImage =
                            att.file_url.match(/\.(jpeg|jpg|gif|png|svg)$/i) !==
                            null;

                          return (
                            <div
                              key={att.id}
                              style={{
                                padding: "10px 12px",
                                borderRadius: "10px",
                                border: `1px solid ${palette.border}`,
                                backgroundColor: "rgba(255,255,255,0.03)",
                              }}
                            >
                              <a
                                href={att.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  color: palette.secondary,
                                  fontWeight: 600,
                                  textDecoration: "none",
                                }}
                              >
                                {att.original_name}
                              </a>

                              {att.comment && (
                                <div
                                  style={{
                                    marginTop: "6px",
                                    fontSize: "14px",
                                    color: palette.textMuted,
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {att.comment}
                                </div>
                              )}

                              {isImage ? (
                                <div style={{ marginTop: "10px" }}>
                                  <img
                                    src={att.file_url}
                                    alt={att.original_name}
                                    style={{
                                      maxWidth: "220px",
                                      width: "100%",
                                      borderRadius: "8px",
                                      border: `1px solid ${palette.border}`,
                                    }}
                                  />
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div
        style={{
          marginTop: "18px",
          display: "grid",
          gap: "10px",
          fontSize: "14px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "10px",
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            ref={attachmentInputRef}
            type="file"
            multiple
            onChange={(event) => onPendingAttachmentsChange(event.target.files)}
            disabled={!room.joined || sendingMessage || uploadingAttachments}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={() => attachmentInputRef.current?.click()}
            disabled={!room.joined || sendingMessage || uploadingAttachments}
            style={{
              ...secondaryButtonStyle,
              minWidth: "auto",
              padding: "6px 10px",
              fontSize: "13px",
              opacity:
                !room.joined || sendingMessage || uploadingAttachments
                  ? 0.6
                  : 1,
              cursor:
                !room.joined || sendingMessage || uploadingAttachments
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            Choose files
          </button>
          <input
            type="text"
            readOnly
            value={
              pendingAttachments.length > 0
                ? `${pendingAttachments.length} file${
                    pendingAttachments.length === 1 ? "" : "s"
                  } selected`
                : "No files selected"
            }
            aria-label="Selected files"
            style={{
              ...inputStyle,
              fontSize: "13px",
              minHeight: "40px",
              padding: "8px 10px",
            }}
          />
        </div>

        {pendingAttachments.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {pendingAttachments.map((file, index) => (
              <button
                key={`${file.name}-${index}`}
                type="button"
                onClick={() => onRemovePendingAttachment(index)}
                disabled={sendingMessage || uploadingAttachments}
                style={{
                  ...secondaryButtonStyle,
                  minWidth: "auto",
                  padding: "6px 10px",
                  fontSize: "12px",
                }}
              >
                Remove {file.name}
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: "12px",
          }}
        >
          <textarea
            placeholder="Type a message..."
            value={messageContent}
            onChange={(e) => onMessageChange(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !sendingMessage &&
                !uploadingAttachments &&
                messageContent.trim()
              ) {
                e.preventDefault();
                onSendMessage();
              }
            }}
            disabled={!room.joined || sendingMessage || uploadingAttachments}
            style={{
              ...inputStyle,
              minHeight: "56px",
              resize: "vertical",
            }}
          />
          <button
            type="button"
            onClick={onSendMessage}
            disabled={
              !room.joined ||
              !messageContent.trim() ||
              sendingMessage ||
              uploadingAttachments
            }
            style={{
              ...secondaryButtonStyle,
              minWidth: "120px",
              opacity:
                !room.joined ||
                !messageContent.trim() ||
                sendingMessage ||
                uploadingAttachments
                  ? 0.6
                  : 1,
              cursor:
                !room.joined ||
                !messageContent.trim() ||
                sendingMessage ||
                uploadingAttachments
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {sendingMessage
              ? "Sending..."
              : uploadingAttachments
                ? "Uploading..."
                : "Send"}
          </button>
        </div>
      </div>
    </Panel>
  );
}

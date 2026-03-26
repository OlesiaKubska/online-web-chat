import type { Room } from "../../types/room";
import type { Message } from "../../types/message";
import {
  palette,
  inputStyle,
  secondaryButtonStyle,
} from "../../styles/roomsTheme";
import { Panel } from "./Panel";
import { MetaPill } from "./MetaPill";

interface ChatPanelProps {
  room: Room;
  messages: Message[];
  messagesLoading: boolean;
  messagesError: string | null;
  messageContent: string;
  onMessageChange: (content: string) => void;
  onSendMessage: () => void;
  sendingMessage: boolean;
  replyTo: Message | null;
  onReply: (message: Message) => void;
  onCancelReply: () => void;
  currentUserId: number | null;
  editingMessageId: number | null;
  editingMessageContent: string;
  onEditingMessageChange: (content: string) => void;
  onStartEdit: (message: Message) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  editingSaving: boolean;
  onDeleteMessage: (messageId: number) => void;
}

export function ChatPanel({
  room,
  messages,
  messagesLoading,
  messagesError,
  messageContent,
  onMessageChange,
  onSendMessage,
  sendingMessage,
  replyTo,
  onReply,
  onCancelReply,
  currentUserId,
  editingMessageId,
  editingMessageContent,
  onEditingMessageChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  editingSaving,
  onDeleteMessage,
}: ChatPanelProps) {
  const orderedMessages = [...messages].reverse();

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

        <MetaPill tone={room.joined ? "success" : "default"}>
          {room.joined ? "Ready to chat" : "Join to participate"}
        </MetaPill>
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
          <div style={{ textAlign: "center", color: palette.textMuted }}>
            Loading messages...
          </div>
        )}
        {messagesError && (
          <div style={{ textAlign: "center", color: palette.danger }}>
            {messagesError}
          </div>
        )}
        {!messagesLoading && !messagesError && messages.length === 0 && (
          <div style={{ textAlign: "center", color: palette.textMuted }}>
            No messages yet. Be the first to send one!
          </div>
        )}
        {!messagesLoading && !messagesError && messages.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
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
                  {currentUserId === message.user && (
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
                      Delete
                    </button>
                  )}
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
                  <div
                    style={{
                      color: palette.textSoft,
                      whiteSpace: "pre-wrap",
                      lineHeight: 1.5,
                    }}
                  >
                    {message.content}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) auto",
          gap: "12px",
          fontSize: "14px",
        }}
      >
        <textarea
          placeholder="Type a message..."
          value={messageContent}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !sendingMessage) {
              e.preventDefault();
              onSendMessage();
            }
          }}
          disabled={!room.joined || sendingMessage}
          style={{
            ...inputStyle,
            minHeight: "56px",
            resize: "vertical",
          }}
        />
        <button
          type="button"
          onClick={onSendMessage}
          disabled={!room.joined || !messageContent.trim() || sendingMessage}
          style={{
            ...secondaryButtonStyle,
            minWidth: "120px",
            opacity:
              !room.joined || !messageContent.trim() || sendingMessage
                ? 0.6
                : 1,
            cursor:
              !room.joined || !messageContent.trim() || sendingMessage
                ? "not-allowed"
                : "pointer",
          }}
        >
          {sendingMessage ? "Sending..." : "Send"}
        </button>
      </div>
    </Panel>
  );
}

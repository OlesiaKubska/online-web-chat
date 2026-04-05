import { useRef, type ClipboardEvent } from "react";

import type { Room } from "../../types/room";
import { inputStyle, secondaryButtonStyle } from "../../styles/roomsTheme";

interface MessageComposerProps {
  room: Room;
  messageContent: string;
  onMessageChange: (content: string) => void;
  onSendMessage: () => void;
  pendingAttachments: File[];
  onPendingAttachmentsChange: (files: FileList | null) => void;
  attachmentComment: string;
  onAttachmentCommentChange: (value: string) => void;
  onComposerPaste: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
  onRemovePendingAttachment: (index: number) => void;
  uploadingAttachments: boolean;
  sendingMessage: boolean;
}

export function MessageComposer({
  room,
  messageContent,
  onMessageChange,
  onSendMessage,
  pendingAttachments,
  onPendingAttachmentsChange,
  attachmentComment,
  onAttachmentCommentChange,
  onComposerPaste,
  onRemovePendingAttachment,
  uploadingAttachments,
  sendingMessage,
}: MessageComposerProps) {
  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  return (
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
              !room.joined || sendingMessage || uploadingAttachments ? 0.6 : 1,
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
        <div style={{ display: "grid", gap: "10px" }}>
          <input
            type="text"
            value={attachmentComment}
            onChange={(event) => onAttachmentCommentChange(event.target.value)}
            placeholder="Optional attachment comment"
            disabled={sendingMessage || uploadingAttachments}
            style={{
              ...inputStyle,
              fontSize: "13px",
              minHeight: "40px",
              padding: "8px 10px",
            }}
          />
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
          onChange={(event) => onMessageChange(event.target.value)}
          onPaste={onComposerPaste}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !sendingMessage &&
              !uploadingAttachments &&
              messageContent.trim()
            ) {
              event.preventDefault();
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
  );
}

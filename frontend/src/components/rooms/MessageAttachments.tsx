import type { MessageAttachment } from "../../types/room";
import { palette } from "../../styles/roomsTheme";

interface MessageAttachmentsProps {
  attachments: MessageAttachment[];
}

export function MessageAttachments({ attachments }: MessageAttachmentsProps) {
  if (attachments.length === 0) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}
    >
      {attachments.map((att) => {
        const isImage =
          att.file_url.match(/\.(jpeg|jpg|gif|png|svg)$/i) !== null;

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
  );
}

import type { Message } from "../../types/message";
import { palette, secondaryButtonStyle } from "../../styles/roomsTheme";

interface ReplyPreviewBannerProps {
  replyTo: Message;
  onCancelReply: () => void;
}

export function ReplyPreviewBanner({
  replyTo,
  onCancelReply,
}: ReplyPreviewBannerProps) {
  return (
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
  );
}

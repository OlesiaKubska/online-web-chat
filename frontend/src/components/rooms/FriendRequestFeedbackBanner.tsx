import { palette } from "../../styles/roomsTheme";

interface FriendRequestFeedbackBannerProps {
  feedback: {
    kind: "success" | "error";
    text: string;
  };
}

export function FriendRequestFeedbackBanner({
  feedback,
}: FriendRequestFeedbackBannerProps) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: "10px",
        border: `1px solid ${
          feedback.kind === "error" ? palette.danger : palette.secondary
        }`,
        backgroundColor:
          feedback.kind === "error"
            ? "rgba(220, 53, 69, 0.1)"
            : "rgba(34, 199, 169, 0.1)",
        color: feedback.kind === "error" ? palette.danger : palette.textSoft,
        fontSize: "14px",
      }}
    >
      {feedback.text}
    </div>
  );
}

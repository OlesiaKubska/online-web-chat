import React from "react";
import { palette } from "../../styles/roomsTheme";

interface MetaPillProps {
  children: React.ReactNode;
  tone?: "default" | "success" | "danger" | "accent";
}

export const MetaPill: React.FC<MetaPillProps> = ({
  children,
  tone = "default",
}) => {
  const toneColors = {
    default: { bg: palette.inputBg, text: palette.textSoft },
    success: { bg: "rgba(34, 199, 169, 0.15)", text: palette.secondary },
    danger: { bg: palette.dangerSoft, text: palette.danger },
    accent: { bg: "rgba(124, 92, 255, 0.18)", text: "#ccbfff" },
  };

  const colors = toneColors[tone];

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: "999px",
        border: `1px solid ${palette.border}`,
        fontSize: "13px",
        backgroundColor: colors.bg,
        color: colors.text,
      }}
    >
      {children}
    </span>
  );
};

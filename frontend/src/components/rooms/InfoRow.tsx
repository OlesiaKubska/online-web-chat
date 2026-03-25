import React from "react";
import { palette } from "../../styles/roomsTheme";

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  tone?: "default" | "success" | "danger";
}

export const InfoRow: React.FC<InfoRowProps> = ({
  label,
  value,
  tone = "default",
}) => {
  const toneColors = {
    default: palette.text,
    success: palette.secondary,
    danger: palette.danger,
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        paddingBottom: "12px",
        marginBottom: "12px",
        borderBottom: `1px solid ${palette.border}`,
      }}
    >
      <span style={{ fontSize: "14px", color: palette.textSoft }}>{label}</span>
      <span
        style={{ fontSize: "14px", fontWeight: 600, color: toneColors[tone] }}
      >
        {value}
      </span>
    </div>
  );
};

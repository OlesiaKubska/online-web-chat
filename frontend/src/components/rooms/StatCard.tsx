import React from "react";
import { palette } from "../../styles/roomsTheme";

interface StatCardProps {
  label: string;
  value: string | number;
}

export const StatCard: React.FC<StatCardProps> = ({ label, value }) => {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "10px",
      }}
    >
      <p
        style={{
          margin: "0 0 6px 0",
          fontSize: "12px",
          color: palette.textMuted,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: 0,
          fontSize: "28px",
          fontWeight: 700,
          color: palette.text,
        }}
      >
        {value}
      </p>
    </div>
  );
};

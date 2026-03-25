import React from "react";
import { palette } from "../../styles/roomsTheme";

export const LoadingState: React.FC = () => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "300px",
        fontSize: "16px",
        color: palette.textSoft,
      }}
    >
      Loading...
    </div>
  );
};

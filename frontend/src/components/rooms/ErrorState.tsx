import React from "react";
import { palette } from "../../styles/roomsTheme";

interface ErrorStateProps {
  message?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  message = "An error occurred",
}) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "300px",
        padding: "20px",
        textAlign: "center",
        fontSize: "16px",
        color: palette.danger,
      }}
    >
      {message}
    </div>
  );
};

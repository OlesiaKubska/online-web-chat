import React from "react";
import { panelStyle } from "../../styles/roomsTheme";

interface PanelProps {
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({ children }) => {
  return <div style={panelStyle}>{children}</div>;
};

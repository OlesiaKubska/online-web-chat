import { secondaryButtonStyle } from "../../styles/roomsTheme";
import { AppNavBar } from "../navigation/AppNavBar";

interface TopBarProps {
  onBack: () => void;
}

export function TopBar({ onBack }: TopBarProps) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <AppNavBar mode="authenticated" />
      <button onClick={onBack} style={secondaryButtonStyle}>
        ← Back to rooms
      </button>
    </div>
  );
}

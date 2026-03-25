import { secondaryButtonStyle } from "../../styles/roomsTheme";

interface TopBarProps {
  onBack: () => void;
}

export function TopBar({ onBack }: TopBarProps) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <button onClick={onBack} style={secondaryButtonStyle}>
        ← Back to rooms
      </button>
    </div>
  );
}

import SectionShell from "../rooms/SectionShell";
import { Panel } from "../rooms/Panel";
import { palette, secondaryButtonStyle } from "../../styles/roomsTheme";

export interface NavItem {
  label: string;
  path: string;
  subtitle: string;
}

interface QuickNavigationSectionProps {
  items: NavItem[];
  onOpen: (path: string) => void;
}

const navGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "12px",
} as const;

export function QuickNavigationSection({
  items,
  onOpen,
}: QuickNavigationSectionProps) {
  return (
    <SectionShell
      title="Quick Navigation"
      subtitle="Jump to key pages of the application."
      count={items.length}
    >
      <div style={navGridStyle}>
        {items.map((item) => (
          <Panel key={item.path}>
            <div style={{ fontWeight: 700, fontSize: "18px" }}>
              {item.label}
            </div>
            <div
              style={{
                marginTop: "6px",
                color: palette.textMuted,
                fontSize: "14px",
              }}
            >
              {item.subtitle}
            </div>

            <button
              type="button"
              onClick={() => onOpen(item.path)}
              style={{ ...secondaryButtonStyle, marginTop: "14px" }}
            >
              Open {item.label}
            </button>
          </Panel>
        ))}
      </div>
    </SectionShell>
  );
}

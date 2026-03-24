import { palette, sectionStyle } from "../../styles/roomsTheme";

interface SectionShellProps {
  title: string;
  subtitle: string;
  count: number;
  children: React.ReactNode;
}

export default function SectionShell({
  title,
  subtitle,
  count,
  children,
}: SectionShellProps) {
  return (
    <section style={sectionStyle}>
      <div
        style={{
          marginBottom: "18px",
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2 style={{ margin: 0, fontSize: "24px" }}>{title}</h2>
          <p
            style={{
              margin: "8px 0 0",
              color: palette.textMuted,
              fontSize: "14px",
            }}
          >
            {subtitle}
          </p>
        </div>

        <div
          style={{
            minWidth: "48px",
            height: "48px",
            borderRadius: "14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: palette.accentSoft,
            color: "#d3c8ff",
            fontWeight: 700,
            border: `1px solid ${palette.border}`,
          }}
        >
          {count}
        </div>
      </div>

      {children}
    </section>
  );
}

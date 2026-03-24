export const palette = {
  pageBg: "#0b1020",
  pageGlow: "#171f3b",
  cardBg: "#121a2f",
  cardSoft: "#18233f",
  border: "#273456",
  text: "#eef2ff",
  textSoft: "#b8c2e0",
  textMuted: "#8b97b8",
  accent: "#7c5cff",
  accentHover: "#6947ff",
  accentSoft: "#2a2154",
  secondary: "#22c7a9",
  secondarySoft: "#153d3a",
  danger: "#ff6b81",
  dangerSoft: "#3a1f2b",
  warning: "#ffb84d",
  inputBg: "#0f1730",
  white: "#ffffff",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: "14px",
  border: `1px solid ${palette.border}`,
  backgroundColor: palette.inputBg,
  color: palette.text,
  outline: "none",
  marginTop: "8px",
  marginBottom: "14px",
};

export const primaryButtonStyle: React.CSSProperties = {
  padding: "11px 14px",
  borderRadius: "14px",
  border: "none",
  background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accentHover} 100%)`,
  color: palette.white,
  fontWeight: 600,
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(124, 92, 255, 0.25)",
};

export const secondaryButtonStyle: React.CSSProperties = {
  padding: "10px 14px",
  borderRadius: "14px",
  border: `1px solid ${palette.border}`,
  backgroundColor: palette.cardBg,
  color: palette.text,
  fontWeight: 600,
  cursor: "pointer",
};

export const dangerButtonStyle: React.CSSProperties = {
  padding: "11px 14px",
  borderRadius: "14px",
  border: "none",
  background: `linear-gradient(135deg, ${palette.danger} 0%, ${palette.danger} 100%)`,
  color: palette.white,
  fontWeight: 600,
  cursor: "pointer",
  width: "100%",
  fontSize: "14px",
};

export const panelStyle: React.CSSProperties = {
  borderRadius: "24px",
  border: `1px solid ${palette.border}`,
  backgroundColor: palette.cardBg,
  padding: "22px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
};

export const panelTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "20px",
  color: palette.text,
  marginBottom: "16px",
};

export const roomGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "16px",
};

export const sectionStyle: React.CSSProperties = {
  borderRadius: "24px",
  border: `1px solid ${palette.border}`,
  backgroundColor: palette.cardBg,
  padding: "22px",
  boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
};

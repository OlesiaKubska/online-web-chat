import type { ReactNode } from "react";

import {
  dangerButtonStyle,
  palette,
  primaryButtonStyle,
  secondaryButtonStyle,
} from "../../styles/roomsTheme";

interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
}: ConfirmModalProps) {
  if (!open) {
    return null;
  }

  const confirmButtonStyle = danger ? dangerButtonStyle : primaryButtonStyle;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(7, 11, 23, 0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 1000,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          width: "min(100%, 420px)",
          borderRadius: "20px",
          border: `1px solid ${palette.border}`,
          background: `linear-gradient(180deg, ${palette.cardBg} 0%, ${palette.cardSoft} 100%)`,
          boxShadow: "0 24px 60px rgba(0,0,0,0.35)",
          padding: "20px",
          display: "grid",
          gap: "14px",
          color: palette.text,
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div>
          <h3 style={{ margin: 0, fontSize: "20px" }}>{title}</h3>
          <div
            style={{
              marginTop: "8px",
              color: palette.textSoft,
              lineHeight: 1.5,
              fontSize: "14px",
            }}
          >
            {message}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              ...secondaryButtonStyle,
              minWidth: "auto",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              ...confirmButtonStyle,
              width: "auto",
              minWidth: "auto",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

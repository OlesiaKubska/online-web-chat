import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRoomById, leaveRoom, joinRoom } from "../lib/roomsApi";
import { ApiError } from "../lib/api";
import type { Room } from "../types/room";
import { palette, primaryButtonStyle, secondaryButtonStyle, dangerButtonStyle, inputStyle, panelTitleStyle } from "../styles/roomsTheme";
import { Panel } from "../components/rooms/Panel";
import { StatCard } from "../components/rooms/StatCard";
import { InfoRow } from "../components/rooms/InfoRow";
import { MetaPill } from "../components/rooms/MetaPill";
import { LoadingState } from "../components/rooms/LoadingState";
import { ErrorState } from "../components/rooms/ErrorState";

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) {
      setError("Invalid room ID");
      setLoading(false);
      return;
    }

    const roomId = parseInt(id, 10);
    if (isNaN(roomId)) {
      setError("Invalid room ID");
      setLoading(false);
      return;
    }

    fetchRoom(roomId);
  }, [id]);

  const fetchRoom = async (roomId: number, showPageLoader = true) => {
    try {
      if (showPageLoader) {
        setLoading(true);
      }

      setError(null);
      const roomData = await getRoomById(roomId);
      setRoom(roomData);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 403) {
          setError("You do not have permission to view this room");
        } else if (err.status === 404) {
          setError("Room not found");
        } else {
          setError(err.message || "Failed to load room");
        }
      } else {
        setError(err instanceof Error ? err.message : "Failed to load room");
      }
    } finally {
      if (showPageLoader) {
        setLoading(false);
      }
    }
  };

  const handleJoin = async () => {
    if (!room) return;

    try {
      setActionLoading(true);
      await joinRoom(room.id);
      await fetchRoom(room.id, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!room) return;

    try {
      setActionLoading(true);
      await leaveRoom(room.id);
      await fetchRoom(room.id, false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to leave room");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <TopBar onBack={() => navigate("/rooms")} />
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <LoadingState />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell>
        <TopBar onBack={() => navigate("/rooms")} />
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <ErrorState message={error} />
        </div>
      </PageShell>
    );
  }

  if (!room) {
    return (
      <PageShell>
        <TopBar onBack={() => navigate("/rooms")} />
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <ErrorState message="Room not found" />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <TopBar onBack={() => navigate("/rooms")} />

        <header
          style={{
            marginBottom: "24px",
            padding: "28px",
            borderRadius: "24px",
            border: `1px solid ${palette.border}`,
            background: `linear-gradient(135deg, ${palette.cardBg} 0%, ${palette.cardSoft} 100%)`,
            boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "20px",
              flexWrap: "wrap",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: 1, minWidth: "280px" }}>
              <div
                style={{
                  display: "inline-flex",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  backgroundColor:
                    room.visibility === "public"
                      ? "rgba(34, 199, 169, 0.15)"
                      : "rgba(255, 107, 129, 0.15)",
                  color:
                    room.visibility === "public"
                      ? palette.secondary
                      : palette.danger,
                  fontSize: "12px",
                  fontWeight: 700,
                  marginBottom: "14px",
                  border: `1px solid ${palette.border}`,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                {room.visibility} room
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "44px",
                  lineHeight: 1,
                  letterSpacing: "-1px",
                  color: palette.text,
                }}
              >
                {room.name}
              </h1>

              <p
                style={{
                  margin: "14px 0 0",
                  color: room.description
                    ? palette.textSoft
                    : palette.textMuted,
                  fontSize: "16px",
                  maxWidth: "720px",
                  lineHeight: 1.6,
                }}
              >
                {room.description ||
                  "This room does not have a description yet."}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(120px, 1fr))",
                gap: "12px",
                minWidth: "280px",
              }}
            >
              <StatCard label="Members" value={room.member_count} />
              <StatCard label="Joined" value={room.joined ? "Yes" : "No"} />
            </div>
          </div>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "340px minmax(0, 1fr)",
            gap: "24px",
            alignItems: "start",
          }}
        >
          <aside
            style={{
              position: "sticky",
              top: "20px",
              display: "grid",
              gap: "20px",
            }}
          >
            <Panel>
              <h2 style={panelTitleStyle}>Room details</h2>
              <div style={{ display: "grid", gap: "12px" }}>
                <InfoRow label="Owner" value={room.owner_username} />
                <InfoRow
                  label="Your role"
                  value={room.my_role ? room.my_role : "Not a member"}
                />
                <InfoRow
                  label="Created"
                  value={new Date(room.created_at).toLocaleDateString()}
                />
                <InfoRow
                  label="Visibility"
                  value={room.visibility}
                  tone={room.visibility === "public" ? "success" : "danger"}
                />
              </div>
            </Panel>

            <Panel>
              <h2 style={panelTitleStyle}>Actions</h2>

              <div style={{ display: "grid", gap: "12px" }}>
                {room.visibility === "public" && !room.joined && (
                  <button
                    onClick={handleJoin}
                    disabled={actionLoading}
                    style={{
                      ...primaryButtonStyle,
                      opacity: actionLoading ? 0.7 : 1,
                      cursor: actionLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {actionLoading ? "Joining..." : "Join room"}
                  </button>
                )}

                {room.joined && room.my_role !== "owner" && (
                  <button
                    onClick={handleLeave}
                    disabled={actionLoading}
                    style={{
                      ...dangerButtonStyle,
                      opacity: actionLoading ? 0.7 : 1,
                      cursor: actionLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {actionLoading ? "Leaving..." : "Leave room"}
                  </button>
                )}

                {room.my_role === "owner" && (
                  <div
                    style={{
                      padding: "12px 14px",
                      borderRadius: "14px",
                      border: `1px solid ${palette.border}`,
                      backgroundColor: palette.cardSoft,
                      color: palette.textMuted,
                      fontSize: "14px",
                      lineHeight: 1.5,
                    }}
                  >
                    Owner cannot leave own room.
                  </div>
                )}

                <button
                  onClick={() => navigate("/rooms")}
                  style={secondaryButtonStyle}
                >
                  Back to rooms
                </button>
              </div>
            </Panel>
          </aside>

          <main style={{ display: "grid", gap: "24px" }}>
            <Panel>
              <div
                style={{
                  marginBottom: "18px",
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "12px",
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h2
                    style={{ margin: 0, fontSize: "26px", color: palette.text }}
                  >
                    Chat
                  </h2>
                  <p
                    style={{
                      margin: "8px 0 0",
                      color: palette.textMuted,
                      fontSize: "14px",
                    }}
                  >
                    Messages UI placeholder for the next step.
                  </p>
                </div>

                <MetaPill tone={room.joined ? "success" : "default"}>
                  {room.joined ? "Ready to chat" : "Join to participate"}
                </MetaPill>
              </div>

              <div
                style={{
                  minHeight: "360px",
                  borderRadius: "22px",
                  border: `1px dashed ${palette.border}`,
                  background: `linear-gradient(180deg, ${palette.cardSoft} 0%, ${palette.cardBg} 100%)`,
                  padding: "24px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: palette.textMuted,
                  textAlign: "center",
                  lineHeight: 1.6,
                }}
              >
                <div>
                  <div style={{ fontSize: "42px", marginBottom: "12px" }}>
                    💬
                  </div>
                  <div style={{ fontSize: "18px", color: palette.textSoft }}>
                    Messages will appear here
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "14px" }}>
                    This room page is ready for the next step: real chat
                    messages.
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: "18px",
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) auto",
                  gap: "12px",
                }}
              >
                <input
                  type="text"
                  placeholder="Type a message..."
                  disabled
                  style={inputStyle}
                />
                <button
                  type="button"
                  disabled
                  style={{
                    ...secondaryButtonStyle,
                    minWidth: "120px",
                    opacity: 0.6,
                    cursor: "not-allowed",
                  }}
                >
                  Send
                </button>
              </div>
            </Panel>
          </main>
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top, ${palette.pageGlow} 0%, ${palette.pageBg} 45%)`,
        color: palette.text,
        padding: "32px 20px 48px",
      }}
    >
      {children}
    </div>
  );
}

function TopBar({ onBack }: { onBack: () => void }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <button onClick={onBack} style={secondaryButtonStyle}>
        ← Back to rooms
      </button>
    </div>
  );
}

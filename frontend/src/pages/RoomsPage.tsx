import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPublicRooms,
  getMyRooms,
  createRoom,
  joinRoom,
} from "../lib/roomsApi";
import type { Room, CreateRoomPayload } from "../types/room";
import { palette, inputStyle, roomGridStyle } from "../styles/roomsTheme";
import SectionShell from "../components/rooms/SectionShell";
import EmptyState from "../components/rooms/EmptyState";
import RoomCard from "../components/rooms/RoomCard";
import { AppNavBar } from "../components/navigation/AppNavBar";

export default function RoomsPage() {
  const navigate = useNavigate();

  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formVisibility, setFormVisibility] = useState<"public" | "private">(
    "public",
  );
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRooms = useCallback(async (search = "") => {
    try {
      setLoading(true);
      setError(null);

      const [publicData, myData] = await Promise.all([
        getPublicRooms(search),
        getMyRooms(),
      ]);

      setPublicRooms(publicData);
      setMyRooms(myData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      setFormError("Room name is required");
      return;
    }

    try {
      setFormLoading(true);
      setFormError(null);

      const payload: CreateRoomPayload = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        visibility: formVisibility,
      };

      const newRoom = await createRoom(payload);

      setFormName("");
      setFormDescription("");
      setFormVisibility("public");

      navigate(`/rooms/${newRoom.id}`);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Failed to create room",
      );
    } finally {
      setFormLoading(false);
    }
  };

  const handleJoinRoom = async (roomId: number) => {
    try {
      setError(null);
      await joinRoom(roomId);
      await fetchRooms(searchTerm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    }
  };

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetchRooms(searchTerm);
  };

  const filteredPublicRooms = publicRooms.filter((room) => !room.joined);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: `radial-gradient(circle at top, ${palette.pageGlow} 0%, ${palette.pageBg} 45%)`,
          color: palette.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
        }}
      >
        Loading rooms...
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top, ${palette.pageGlow} 0%, ${palette.pageBg} 45%)`,
        color: palette.text,
        padding: "32px 20px 48px",
      }}
    >
      <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
        <AppNavBar mode="authenticated" />

        <header
          style={{
            marginBottom: "28px",
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
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  display: "inline-flex",
                  padding: "6px 12px",
                  borderRadius: "999px",
                  backgroundColor: palette.accentSoft,
                  color: "#c9bcff",
                  fontSize: "13px",
                  marginBottom: "14px",
                  border: `1px solid ${palette.border}`,
                }}
              >
                Rooms workspace
              </div>

              <h1
                style={{
                  margin: 0,
                  fontSize: "48px",
                  lineHeight: 1,
                  letterSpacing: "-1px",
                }}
              >
                Rooms
              </h1>

              <p
                style={{
                  margin: "12px 0 0",
                  color: palette.textSoft,
                  fontSize: "16px",
                  maxWidth: "720px",
                }}
              >
                Create private or public spaces, browse available rooms, and
                jump into the one you want to open.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(120px, 1fr))",
                gap: "12px",
                minWidth: "260px",
              }}
            >
              <StatCard label="My rooms" value={myRooms.length} />
              <StatCard
                label="Public rooms"
                value={filteredPublicRooms.length}
              />
            </div>
          </div>
        </header>

        {error && (
          <div
            style={{
              marginBottom: "20px",
              padding: "14px 16px",
              borderRadius: "16px",
              border: `1px solid ${palette.danger}`,
              backgroundColor: palette.dangerSoft,
              color: "#ffd5db",
            }}
          >
            {error}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "360px minmax(0, 1fr)",
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
            <section
              style={{
                borderRadius: "24px",
                border: `1px solid ${palette.border}`,
                backgroundColor: palette.cardBg,
                padding: "22px",
                boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ marginBottom: "18px" }}>
                <h2 style={{ margin: 0, fontSize: "22px" }}>Create room</h2>
                <p
                  style={{
                    margin: "8px 0 0",
                    color: palette.textMuted,
                    fontSize: "14px",
                  }}
                >
                  Start a new place for chat, collaboration, or experiments.
                </p>
              </div>

              <form onSubmit={handleCreateRoom}>
                <FieldLabel>Room name</FieldLabel>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  disabled={formLoading}
                  style={inputStyle}
                  placeholder="e.g. General, Design Lab"
                />

                <FieldLabel>Description</FieldLabel>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={formLoading}
                  style={{
                    ...inputStyle,
                    minHeight: "100px",
                    resize: "vertical",
                  }}
                  placeholder="What is this room about?"
                />

                <FieldLabel>Visibility</FieldLabel>
                <select
                  value={formVisibility}
                  onChange={(e) =>
                    setFormVisibility(e.target.value as "public" | "private")
                  }
                  disabled={formLoading}
                  style={inputStyle}
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>

                {formError && (
                  <div
                    style={{
                      marginTop: "12px",
                      padding: "12px",
                      borderRadius: "12px",
                      border: `1px solid ${palette.danger}`,
                      backgroundColor: palette.dangerSoft,
                      color: "#ffd5db",
                      fontSize: "14px",
                    }}
                  >
                    {formError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={formLoading}
                  style={{
                    marginTop: "16px",
                    width: "100%",
                    padding: "12px 16px",
                    border: "none",
                    borderRadius: "14px",
                    background: `linear-gradient(135deg, ${palette.accent} 0%, ${palette.accentHover} 100%)`,
                    color: palette.white,
                    fontWeight: 600,
                    cursor: formLoading ? "not-allowed" : "pointer",
                    opacity: formLoading ? 0.7 : 1,
                    boxShadow: "0 10px 20px rgba(124, 92, 255, 0.25)",
                  }}
                >
                  {formLoading ? "Creating..." : "Create room"}
                </button>
              </form>
            </section>

            <section
              style={{
                borderRadius: "24px",
                border: `1px solid ${palette.border}`,
                backgroundColor: palette.cardBg,
                padding: "22px",
                boxShadow: "0 12px 30px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ marginBottom: "18px" }}>
                <h2 style={{ margin: 0, fontSize: "22px" }}>Discover rooms</h2>
                <p
                  style={{
                    margin: "8px 0 0",
                    color: palette.textMuted,
                    fontSize: "14px",
                  }}
                >
                  Search by room name or description.
                </p>
              </div>

              <form onSubmit={handleSearchSubmit}>
                <input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search public rooms..."
                  style={inputStyle}
                />

                <button
                  type="submit"
                  style={{
                    marginTop: "12px",
                    width: "100%",
                    padding: "11px 14px",
                    borderRadius: "14px",
                    border: `1px solid ${palette.border}`,
                    backgroundColor: palette.cardSoft,
                    color: palette.text,
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Search
                </button>
              </form>
            </section>
          </aside>

          <main style={{ display: "grid", gap: "24px" }}>
            <SectionShell
              title="My rooms"
              subtitle="Rooms where you already belong."
              count={myRooms.length}
            >
              {myRooms.length === 0 ? (
                <EmptyState text="You are not a member of any rooms yet." />
              ) : (
                <div style={roomGridStyle}>
                  {myRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onJoin={handleJoinRoom}
                    />
                  ))}
                </div>
              )}
            </SectionShell>

            <SectionShell
              title="Public rooms"
              subtitle="Open spaces you can explore and join."
              count={filteredPublicRooms.length}
            >
              {filteredPublicRooms.length === 0 ? (
                <EmptyState text="No public rooms available right now." />
              ) : (
                <div style={roomGridStyle}>
                  {filteredPublicRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      onJoin={handleJoinRoom}
                    />
                  ))}
                </div>
              )}
            </SectionShell>
          </main>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: "16px",
        borderRadius: "18px",
        backgroundColor: palette.cardSoft,
        border: `1px solid ${palette.border}`,
      }}
    >
      <div
        style={{
          color: palette.textMuted,
          fontSize: "13px",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "28px", fontWeight: 700, color: palette.text }}>
        {value}
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        color: palette.textSoft,
        fontSize: "14px",
        fontWeight: 500,
      }}
    >
      {children}
    </label>
  );
}

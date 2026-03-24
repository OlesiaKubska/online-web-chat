import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getPublicRooms,
  getMyRooms,
  createRoom,
  joinRoom,
} from "../lib/roomsApi";
import type { Room, CreateRoomPayload } from "../types/room";

export default function RoomsPage() {
  const navigate = useNavigate();

  const [publicRooms, setPublicRooms] = useState<Room[]>([]);
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formVisibility, setFormVisibility] = useState<"public" | "private">(
    "public",
  );
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [publicData, myData] = await Promise.all([
        getPublicRooms(),
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

      setFormError(null);
      setFormName("");
      setFormDescription("");

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
      await fetchRooms();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    }
  };

  if (loading) {
    return <div style={{ padding: "20px" }}>Loading rooms...</div>;
  }

  const filteredPublicRooms = publicRooms.filter((room) => !room.joined);

  return (
    <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
      <h1>Rooms</h1>

      {error && (
        <div
          style={{
            padding: "10px",
            marginBottom: "20px",
            backgroundColor: "#fee",
            border: "1px solid #fcc",
            borderRadius: "4px",
            color: "#c33",
          }}
        >
          {error}
        </div>
      )}

      <div
        style={{
          marginBottom: "40px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "#f9f9f9",
        }}
      >
        <h2>Create New Room</h2>
        <form onSubmit={handleCreateRoom}>
          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Room Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={formLoading}
              style={{
                padding: "8px",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Description (optional)
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              disabled={formLoading}
              style={{
                padding: "8px",
                width: "100%",
                boxSizing: "border-box",
                minHeight: "80px",
              }}
            />
          </div>

          <div style={{ marginBottom: "15px" }}>
            <label style={{ display: "block", marginBottom: "5px" }}>
              Visibility
            </label>
            <select
              value={formVisibility}
              onChange={(e) =>
                setFormVisibility(e.target.value as "public" | "private")
              }
              disabled={formLoading}
              style={{ padding: "8px", width: "100%", boxSizing: "border-box" }}
            >
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </div>

          {formError && (
            <div
              style={{
                padding: "10px",
                marginBottom: "10px",
                backgroundColor: "#fee",
                border: "1px solid #fcc",
                borderRadius: "4px",
                color: "#c33",
              }}
            >
              {formError}
            </div>
          )}

          <button
            type="submit"
            disabled={formLoading}
            style={{
              padding: "10px 20px",
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: formLoading ? "not-allowed" : "pointer",
              opacity: formLoading ? 0.6 : 1,
            }}
          >
            {formLoading ? "Creating..." : "Create Room"}
          </button>
        </form>
      </div>

      <div style={{ marginBottom: "40px" }}>
        <h2>My Rooms ({myRooms.length})</h2>
        {myRooms.length === 0 ? (
          <p style={{ color: "#666" }}>
            You are not a member of any rooms yet.
          </p>
        ) : (
          <div>
            {myRooms.map((room) => (
              <RoomCard key={room.id} room={room} onJoin={handleJoinRoom} />
            ))}
          </div>
        )}
      </div>

      <div>
        <h2>Public Rooms ({filteredPublicRooms.length})</h2>
        {filteredPublicRooms.length === 0 ? (
          <p style={{ color: "#666" }}>No public rooms available.</p>
        ) : (
          <div>
            {filteredPublicRooms.map((room) => (
              <RoomCard key={room.id} room={room} onJoin={handleJoinRoom} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface RoomCardProps {
  room: Room;
  onJoin: (id: number) => Promise<void>;
}

function RoomCard({ room, onJoin }: RoomCardProps) {
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const handleJoinClick = async () => {
    try {
      setJoining(true);
      await onJoin(room.id);
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      style={{
        marginBottom: "15px",
        padding: "15px",
        border: "1px solid #ddd",
        borderRadius: "4px",
        backgroundColor: "#fff",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: "0 0 5px 0" }}>
            {room.name}{" "}
            <span style={{ fontSize: "0.85em", color: "#999" }}>
              ({room.visibility})
            </span>
          </h3>

          {room.description && (
            <p style={{ margin: "5px 0", color: "#555" }}>{room.description}</p>
          )}

          <div style={{ fontSize: "0.9em", color: "#666", marginTop: "8px" }}>
            <span style={{ marginRight: "15px" }}>
              👤 {room.member_count} member{room.member_count !== 1 ? "s" : ""}
            </span>

            <span style={{ marginRight: "15px" }}>
              Owner: {room.owner_username}
            </span>

            {room.joined && (
              <span style={{ marginRight: "15px", color: "#198754" }}>
                Joined
              </span>
            )}

            {room.my_role && (
              <span style={{ marginRight: "15px", color: "#0066cc" }}>
                Your role: {room.my_role}
              </span>
            )}
          </div>
        </div>

        <div style={{ marginLeft: "20px", whiteSpace: "nowrap" }}>
          <button
            onClick={() => navigate(`/rooms/${room.id}`)}
            style={{
              padding: "8px 12px",
              marginRight: "10px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Open
          </button>

          {room.visibility === "public" && !room.joined && (
            <button
              onClick={handleJoinClick}
              disabled={joining}
              style={{
                padding: "8px 12px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: joining ? "not-allowed" : "pointer",
                opacity: joining ? 0.6 : 1,
              }}
            >
              {joining ? "Joining..." : "Join"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

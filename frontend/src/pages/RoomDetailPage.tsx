import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getRoomById, leaveRoom, joinRoom } from "../lib/roomsApi";
import { ApiError } from "../lib/api";
import type { Room } from "../types/room";

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

  if (loading) {
    return (
      <div style={{ padding: "20px" }}>
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={() => navigate("/rooms")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ← Back to rooms
          </button>
        </div>
        Loading room...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "20px" }}>
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={() => navigate("/rooms")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ← Back to rooms
          </button>
        </div>

        <div
          style={{
            padding: "20px",
            backgroundColor: "#f8d7da",
            border: "1px solid #f5c6cb",
            borderRadius: "4px",
            color: "#721c24",
          }}
        >
          <h2 style={{ margin: "0 0 10px 0" }}>Error</h2>
          <p style={{ margin: 0 }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div style={{ padding: "20px" }}>
        <div style={{ marginBottom: "20px" }}>
          <button
            onClick={() => navigate("/rooms")}
            style={{
              padding: "8px 16px",
              backgroundColor: "#6c757d",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            ← Back to rooms
          </button>
        </div>
        Room not found
      </div>
    );
  }

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

  return (
    <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={() => navigate("/rooms")}
          style={{
            padding: "8px 16px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          ← Back to rooms
        </button>
      </div>

      <div
        style={{
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "4px",
          backgroundColor: "#fff",
        }}
      >
        <h1 style={{ margin: "0 0 10px 0" }}>{room.name}</h1>

        <div style={{ marginBottom: "15px" }}>
          <span
            style={{
              display: "inline-block",
              padding: "4px 8px",
              backgroundColor:
                room.visibility === "public" ? "#d4edda" : "#f8d7da",
              color: room.visibility === "public" ? "#155724" : "#721c24",
              borderRadius: "4px",
              fontSize: "0.9em",
              fontWeight: "bold",
            }}
          >
            {room.visibility}
          </span>
        </div>

        {room.description && (
          <div style={{ marginBottom: "15px" }}>
            <h3 style={{ margin: "0 0 5px 0", color: "#333" }}>Description</h3>
            <p style={{ margin: 0, color: "#555", lineHeight: "1.5" }}>
              {room.description}
            </p>
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px",
          }}
        >
          <div>
            <h3 style={{ margin: "0 0 5px 0", color: "#333" }}>Owner</h3>
            <p style={{ margin: 0, color: "#555" }}>{room.owner_username}</p>
          </div>

          <div>
            <h3 style={{ margin: "0 0 5px 0", color: "#333" }}>Members</h3>
            <p style={{ margin: 0, color: "#555" }}>
              {room.member_count} member{room.member_count !== 1 ? "s" : ""}
            </p>
          </div>

          <div>
            <h3 style={{ margin: "0 0 5px 0", color: "#333" }}>Your Role</h3>
            <p style={{ margin: 0, color: "#555" }}>
              {room.my_role ? room.my_role : "Not a member"}
            </p>
          </div>

          <div>
            <h3 style={{ margin: "0 0 5px 0", color: "#333" }}>Created</h3>
            <p style={{ margin: 0, color: "#555" }}>
              {new Date(room.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div style={{ marginTop: "20px" }}>
          {room.visibility === "public" && !room.joined && (
            <button
              onClick={handleJoin}
              disabled={actionLoading}
              style={{
                padding: "10px 16px",
                backgroundColor: "#007bff",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: actionLoading ? "not-allowed" : "pointer",
                opacity: actionLoading ? 0.6 : 1,
                marginRight: "10px",
              }}
            >
              {actionLoading ? "Joining..." : "Join Room"}
            </button>
          )}

          {room.joined && room.my_role !== "owner" && (
            <button
              onClick={handleLeave}
              disabled={actionLoading}
              style={{
                padding: "10px 16px",
                backgroundColor: "#dc3545",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: actionLoading ? "not-allowed" : "pointer",
                opacity: actionLoading ? 0.6 : 1,
              }}
            >
              {actionLoading ? "Leaving..." : "Leave Room"}
            </button>
          )}

          {room.my_role === "owner" && (
            <p style={{ marginTop: "10px", color: "#666" }}>
              Owner cannot leave own room.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

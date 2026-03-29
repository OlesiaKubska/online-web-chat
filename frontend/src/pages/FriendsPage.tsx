import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  acceptFriendRequest,
  banUser,
  cancelFriendRequest,
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  removeFriend,
  rejectFriendRequest,
  sendFriendRequestByUsername,
} from "../lib/friendsApi";
import { ApiError } from "../lib/api";
import type { Friend, FriendRequest } from "../types/friends";
import { PageShell } from "../components/rooms/PageShell";
import { TopBar } from "../components/rooms/TopBar";
import SectionShell from "../components/rooms/SectionShell";
import { Panel } from "../components/rooms/Panel";
import {
  palette,
  inputStyle,
  primaryButtonStyle,
  secondaryButtonStyle,
  dangerButtonStyle,
  panelTitleStyle,
} from "../styles/roomsTheme";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
}

export default function FriendsPage() {
  const navigate = useNavigate();

  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);

  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [friendActionLoadingKey, setFriendActionLoadingKey] = useState<
    string | null
  >(null);

  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [friendsData, incomingData, outgoingData] = await Promise.all([
        getFriends(),
        getIncomingFriendRequests(),
        getOutgoingFriendRequests(),
      ]);

      setFriends(friendsData);
      setIncoming(incomingData);
      setOutgoing(outgoingData);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load friends data"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const normalizedUsername = username.trim().toLowerCase();

  const hasPendingRequest = outgoing.some(
    (req) => req.to_username.trim().toLowerCase() === normalizedUsername,
  );

  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasPendingRequest) {
      setFormError("You already sent a request to this user");
      return;
    }

    if (!username.trim()) {
      setFormError("Username is required");
      return;
    }

    try {
      setSubmitting(true);
      setFormError(null);

      await sendFriendRequestByUsername({
        username: username.trim(),
        message: message.trim(),
      });

      setUsername("");
      setMessage("");
      setFormError(null);
      await fetchData();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to send friend request"));
    } finally {
      setSubmitting(false);
    }
  };

  const runRequestAction = async (
    requestId: number,
    action: () => Promise<unknown>,
  ) => {
    try {
      setActionLoadingId(requestId);
      setError(null);
      await action();
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err, "Action failed"));
    } finally {
      setActionLoadingId(null);
    }
  };

  const runFriendAction = async (
    userId: number,
    actionName: "remove" | "ban",
    action: () => Promise<unknown>,
  ) => {
    const loadingKey = `${actionName}-${userId}`;

    try {
      setFriendActionLoadingKey(loadingKey);
      setError(null);
      await action();
      await fetchData();
    } catch (err) {
      setError(getErrorMessage(err, "Action failed"));
    } finally {
      setFriendActionLoadingKey(null);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <TopBar onBack={() => navigate("/rooms")} />
          <Panel>
            <div style={{ color: palette.textSoft, fontSize: "16px" }}>
              Loading friends...
            </div>
          </Panel>
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
            Friends workspace
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "46px",
              lineHeight: 1,
              letterSpacing: "-1px",
            }}
          >
            Friends
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: palette.textSoft,
              fontSize: "16px",
              maxWidth: "720px",
            }}
          >
            Manage friend requests, accept incoming invites, and keep your
            connections organized.
          </p>
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
            <Panel>
              <h2 style={panelTitleStyle}>Send Friend Request</h2>

              <form onSubmit={handleSendRequest}>
                <label htmlFor="friend-username">Username</label>
                <input
                  id="friend-username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="target username"
                  disabled={submitting}
                  style={inputStyle}
                />

                <label htmlFor="friend-message">Message (optional)</label>
                <input
                  id="friend-message"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setFormError(null);
                  }}
                  placeholder="optional note"
                  disabled={submitting}
                  style={inputStyle}
                />

                {formError && (
                  <div
                    style={{
                      marginBottom: "14px",
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
                  disabled={submitting || hasPendingRequest}
                  style={{
                    ...primaryButtonStyle,
                    width: "100%",
                    opacity: submitting || hasPendingRequest ? 0.7 : 1,
                    cursor:
                      submitting || hasPendingRequest
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  {submitting ? "Sending..." : "Send request"}
                </button>
                {hasPendingRequest && (
                  <div
                    style={{
                      marginBottom: "14px",
                      color: "#ffd5db",
                      fontSize: "14px",
                    }}
                  >
                    You already sent a pending request to this user.
                  </div>
                )}
              </form>
            </Panel>
          </aside>

          <main style={{ display: "grid", gap: "24px" }}>
            <SectionShell
              title="Incoming Requests"
              subtitle="Requests waiting for your decision."
              count={incoming.length}
            >
              {incoming.length === 0 ? (
                <p style={{ color: palette.textMuted, margin: 0 }}>
                  No incoming requests.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {incoming.map((request) => (
                    <Panel key={request.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {request.from_username}
                          </div>
                          {request.message ? (
                            <div
                              style={{
                                marginTop: "6px",
                                color: palette.textMuted,
                                fontSize: "14px",
                              }}
                            >
                              {request.message}
                            </div>
                          ) : null}
                        </div>

                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={() =>
                              runRequestAction(request.id, () =>
                                acceptFriendRequest(request.id),
                              )
                            }
                            disabled={actionLoadingId === request.id}
                            style={{
                              ...secondaryButtonStyle,
                              backgroundColor: palette.secondarySoft,
                              borderColor: palette.secondary,
                              color: palette.text,
                              opacity: actionLoadingId === request.id ? 0.7 : 1,
                            }}
                          >
                            Accept
                          </button>
                          <button
                            onClick={() =>
                              runRequestAction(request.id, () =>
                                rejectFriendRequest(request.id),
                              )
                            }
                            disabled={actionLoadingId === request.id}
                            style={{
                              ...dangerButtonStyle,
                              width: "auto",
                              opacity: actionLoadingId === request.id ? 0.7 : 1,
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    </Panel>
                  ))}
                </div>
              )}
            </SectionShell>

            <SectionShell
              title="Outgoing Requests"
              subtitle="Requests you have sent and can still cancel."
              count={outgoing.length}
            >
              {outgoing.length === 0 ? (
                <p style={{ color: palette.textMuted, margin: 0 }}>
                  No outgoing requests.
                </p>
              ) : (
                <div style={{ display: "grid", gap: "12px" }}>
                  {outgoing.map((request) => (
                    <Panel key={request.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {request.to_username}
                          </div>
                          {request.message ? (
                            <div
                              style={{
                                marginTop: "6px",
                                color: palette.textMuted,
                                fontSize: "14px",
                              }}
                            >
                              {request.message}
                            </div>
                          ) : null}
                        </div>

                        <button
                          onClick={() =>
                            runRequestAction(request.id, () =>
                              cancelFriendRequest(request.id),
                            )
                          }
                          disabled={actionLoadingId === request.id}
                          style={{
                            ...secondaryButtonStyle,
                            opacity: actionLoadingId === request.id ? 0.7 : 1,
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </Panel>
                  ))}
                </div>
              )}
            </SectionShell>

            <SectionShell
              title="Friends List"
              subtitle="People already connected with you."
              count={friends.length}
            >
              {friends.length === 0 ? (
                <p style={{ color: palette.textMuted, margin: 0 }}>
                  No friends yet.
                </p>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: "12px",
                  }}
                >
                  {friends.map((friend) => (
                    <Panel key={friend.id}>
                      <div style={{ fontWeight: 700 }}>{friend.username}</div>
                      <div
                        style={{
                          marginTop: "6px",
                          color: palette.textMuted,
                          fontSize: "14px",
                        }}
                      >
                        {friend.email}
                      </div>

                      <div
                        style={{
                          marginTop: "12px",
                          display: "flex",
                          gap: "8px",
                          flexWrap: "wrap",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            runFriendAction(friend.id, "remove", () =>
                              removeFriend(friend.id),
                            )
                          }
                          disabled={
                            friendActionLoadingKey === `remove-${friend.id}`
                          }
                          style={{
                            ...secondaryButtonStyle,
                            opacity:
                              friendActionLoadingKey === `remove-${friend.id}`
                                ? 0.7
                                : 1,
                          }}
                        >
                          {friendActionLoadingKey === `remove-${friend.id}`
                            ? "Removing..."
                            : "Remove friend"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            runFriendAction(friend.id, "ban", () =>
                              banUser(friend.id),
                            )
                          }
                          disabled={
                            friendActionLoadingKey === `ban-${friend.id}`
                          }
                          style={{
                            ...dangerButtonStyle,
                            width: "auto",
                            opacity:
                              friendActionLoadingKey === `ban-${friend.id}`
                                ? 0.7
                                : 1,
                          }}
                        >
                          {friendActionLoadingKey === `ban-${friend.id}`
                            ? "Banning..."
                            : "Ban user"}
                        </button>
                      </div>
                    </Panel>
                  ))}
                </div>
              )}
            </SectionShell>
          </main>
        </div>
      </div>
    </PageShell>
  );
}

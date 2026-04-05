import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  acceptFriendRequest,
  banUser,
  cancelFriendRequest,
  createOrGetDialog,
  getDirectDialogs,
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  removeFriend,
  rejectFriendRequest,
  sendFriendRequestByUsername,
} from "../lib/friendsApi";
import {
  ApiError,
  getUsersPresence,
  type UserPresenceStatus,
} from "../lib/api";
import type { Friend, FriendRequest } from "../types/friends";
import type { Room } from "../types/room";
import { getCurrentUser } from "../lib/roomsApi";
import { PageShell } from "../components/rooms/PageShell";
import { TopBar } from "../components/rooms/TopBar";
import { Panel } from "../components/rooms/Panel";
import { palette } from "../styles/roomsTheme";
import { FriendsHero } from "../components/friends/FriendsHero";
import { ErrorBanner } from "../components/friends/ErrorBanner";
import { SendFriendRequestPanel } from "../components/friends/SendFriendRequestPanel";
import { IncomingRequestsSection } from "../components/friends/IncomingRequestsSection";
import { OutgoingRequestsSection } from "../components/friends/OutgoingRequestsSection";
import { DirectDialogsSection } from "../components/friends/DirectDialogsSection";
import { FriendsListSection } from "../components/friends/FriendsListSection";
import { TwoColumnLayout } from "../components/layout/TwoColumnLayout";

const PRESENCE_REFRESH_INTERVAL_MS = 2000;
const DIALOG_REFRESH_INTERVAL_MS = 5000;

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
  const [dialogs, setDialogs] = useState<Room[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [presenceByUserId, setPresenceByUserId] = useState<
    Record<number, UserPresenceStatus>
  >({});

  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [friendActionLoadingKey, setFriendActionLoadingKey] = useState<
    string | null
  >(null);
  const [messageLoadingId, setMessageLoadingId] = useState<number | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const refreshPresence = useCallback(async () => {
    if (currentUserId === null) {
      setPresenceByUserId({});
      return;
    }

    const presenceUserIds = new Set<number>();
    friends.forEach((friend) => presenceUserIds.add(friend.id));
    incoming.forEach((request) => presenceUserIds.add(request.from_user));
    outgoing.forEach((request) => presenceUserIds.add(request.to_user));
    dialogs.forEach((dialog) => {
      if (dialog.dm_user1 && dialog.dm_user1 !== currentUserId) {
        presenceUserIds.add(dialog.dm_user1);
      }
      if (dialog.dm_user2 && dialog.dm_user2 !== currentUserId) {
        presenceUserIds.add(dialog.dm_user2);
      }
    });

    if (presenceUserIds.size === 0) {
      setPresenceByUserId({});
      return;
    }

    try {
      const statuses = await getUsersPresence([...presenceUserIds]);
      const nextPresenceMap: Record<number, UserPresenceStatus> = {};
      statuses.forEach((statusItem) => {
        nextPresenceMap[statusItem.user_id] = statusItem.status;
      });
      setPresenceByUserId(nextPresenceMap);
    } catch {
      setPresenceByUserId({});
    }
  }, [currentUserId, dialogs, friends, incoming, outgoing]);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [friendsData, incomingData, outgoingData, dialogsData, me] =
        await Promise.all([
          getFriends(),
          getIncomingFriendRequests(),
          getOutgoingFriendRequests(),
          getDirectDialogs(),
          getCurrentUser(),
        ]);

      setFriends(friendsData);
      setIncoming(incomingData);
      setOutgoing(outgoingData);
      setDialogs(dialogsData);
      setCurrentUserId(me.id);

      try {
        const presenceUserIds = new Set<number>();
        friendsData.forEach((friend) => presenceUserIds.add(friend.id));
        incomingData.forEach((request) =>
          presenceUserIds.add(request.from_user),
        );
        outgoingData.forEach((request) => presenceUserIds.add(request.to_user));
        dialogsData.forEach((dialog) => {
          if (dialog.dm_user1 && dialog.dm_user1 !== me.id) {
            presenceUserIds.add(dialog.dm_user1);
          }
          if (dialog.dm_user2 && dialog.dm_user2 !== me.id) {
            presenceUserIds.add(dialog.dm_user2);
          }
        });

        const statuses = await getUsersPresence([...presenceUserIds]);
        const nextPresenceMap: Record<number, UserPresenceStatus> = {};
        statuses.forEach((statusItem) => {
          nextPresenceMap[statusItem.user_id] = statusItem.status;
        });
        setPresenceByUserId(nextPresenceMap);
      } catch {
        setPresenceByUserId({});
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load friends data"));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshDialogs = useCallback(async () => {
    try {
      const dialogsData = await getDirectDialogs();
      setDialogs(dialogsData);
    } catch {
      // Ignore background refresh errors and keep current notification badges.
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const refreshUnreadDialogs = () => {
      if (document.visibilityState === "visible") {
        void refreshDialogs();
      }
    };

    const intervalId = window.setInterval(
      refreshUnreadDialogs,
      DIALOG_REFRESH_INTERVAL_MS,
    );
    window.addEventListener("focus", refreshUnreadDialogs);
    document.addEventListener("visibilitychange", refreshUnreadDialogs);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshUnreadDialogs);
      document.removeEventListener("visibilitychange", refreshUnreadDialogs);
    };
  }, [refreshDialogs]);

  useEffect(() => {
    void refreshPresence();
    const intervalId = window.setInterval(() => {
      void refreshPresence();
    }, PRESENCE_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshPresence]);

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

  const handleMessage = async (friendId: number) => {
    try {
      setMessageLoadingId(friendId);
      setError(null);
      const room = await createOrGetDialog(friendId);
      navigate(`/rooms/${room.id}`);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to open dialog"));
    } finally {
      setMessageLoadingId(null);
    }
  };

  if (loading) {
    return (
      <PageShell>
        <div style={{ maxWidth: "1280px", margin: "0 auto" }}>
          <TopBar />
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
        <TopBar />

        <FriendsHero />

        {error && <ErrorBanner error={error} />}

        <TwoColumnLayout
          sidebar={
            <aside
              style={{
                position: "sticky",
                top: "20px",
                display: "grid",
                gap: "20px",
              }}
            >
              <SendFriendRequestPanel
                username={username}
                message={message}
                submitting={submitting}
                hasPendingRequest={hasPendingRequest}
                formError={formError}
                onUsernameChange={(value) => {
                  setUsername(value);
                  setFormError(null);
                }}
                onMessageChange={(value) => {
                  setMessage(value);
                  setFormError(null);
                }}
                onSubmit={handleSendRequest}
              />
            </aside>
          }
          sidebarWidth="360px"
          sidebarPosition="right"
        >
          <IncomingRequestsSection
            incoming={incoming}
            actionLoadingId={actionLoadingId}
            presenceByUserId={presenceByUserId}
            onAccept={(requestId) =>
              runRequestAction(requestId, () => acceptFriendRequest(requestId))
            }
            onReject={(requestId) =>
              runRequestAction(requestId, () => rejectFriendRequest(requestId))
            }
          />

          <OutgoingRequestsSection
            outgoing={outgoing}
            actionLoadingId={actionLoadingId}
            presenceByUserId={presenceByUserId}
            onCancel={(requestId) =>
              runRequestAction(requestId, () => cancelFriendRequest(requestId))
            }
          />

          <DirectDialogsSection
            dialogs={dialogs}
            currentUserId={currentUserId}
            presenceByUserId={presenceByUserId}
            onOpenDialog={(roomId) => navigate(`/rooms/${roomId}`)}
          />

          <FriendsListSection
            friends={friends}
            messageLoadingId={messageLoadingId}
            friendActionLoadingKey={friendActionLoadingKey}
            presenceByUserId={presenceByUserId}
            onMessage={handleMessage}
            onRemoveFriend={(friendId) =>
              runFriendAction(friendId, "remove", () => removeFriend(friendId))
            }
            onBanUser={(friendId) =>
              runFriendAction(friendId, "ban", () => banUser(friendId))
            }
          />
        </TwoColumnLayout>
      </div>
    </PageShell>
  );
}

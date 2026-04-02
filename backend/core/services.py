from datetime import timedelta
from django.utils import timezone

from .models import UserPresence

OFFLINE = "offline"
RECENT_PRESENCE_SECONDS = 60
STALE_PRESENCE_MINUTES = 5


def update_presence(user, session_id, tab_id, status):
    """
    Create or update UserPresence record for the given user, session, and tab.
    """
    presence, created = UserPresence.objects.get_or_create(
        user=user,
        session_id=session_id,
        tab_id=tab_id,
        defaults={"status": status},
    )

    if not created:
        presence.status = status
        presence.last_seen = timezone.now()
        presence.save(update_fields=["status", "last_seen"])

    return presence


def get_user_presence(user):
    """
    Resolve effective user presence.

    Rules:
    - Aggregate across ALL tabs/sessions using each tab's latest heartbeat.
    - If ANY tab is ONLINE -> ONLINE
    - If ALL tabs are AFK (no ONLINE) -> AFK
    - If there are no active tabs/sessions -> OFFLINE
    """
    recent_threshold = timezone.now() - timedelta(seconds=RECENT_PRESENCE_SECONDS)

    recent_presences = (
        UserPresence.objects.filter(
            user=user,
            last_seen__gte=recent_threshold,
        )
        .order_by('session_id', 'tab_id', '-last_seen')
        .values('session_id', 'tab_id', 'status')
    )

    # Aggregate by (session_id, tab_id) tuple, keeping latest per tab.
    latest_status_by_tab = {}
    for entry in recent_presences:
        tab_key = (entry['session_id'], entry['tab_id'])
        if tab_key not in latest_status_by_tab:
            latest_status_by_tab[tab_key] = entry['status']

    statuses = list(latest_status_by_tab.values())
    
    # If ANY tab is ONLINE, user is ONLINE.
    if any(status == UserPresence.Status.ONLINE for status in statuses):
        return UserPresence.Status.ONLINE

    # If there are tabs and ALL are AFK, user is AFK.
    if statuses and all(status == UserPresence.Status.AFK for status in statuses):
        return UserPresence.Status.AFK

    # No recent presence across any tab -> OFFLINE.
    return OFFLINE


def cleanup_stale_presence():
    """
    Remove stale presence records older than configured threshold.
    """
    threshold = timezone.now() - timedelta(minutes=STALE_PRESENCE_MINUTES)
    deleted_count, _ = UserPresence.objects.filter(last_seen__lt=threshold).delete()
    return deleted_count


def close_presence_tab(user, session_id, tab_id):
    """
    Remove presence record for a specific user/session/tab immediately.
    """
    deleted_count, _ = UserPresence.objects.filter(
        user=user,
        session_id=session_id,
        tab_id=tab_id,
    ).delete()
    return deleted_count
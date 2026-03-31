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
    - If ANY recent record is ONLINE -> ONLINE
    - If there are recent records and ALL are AFK -> AFK
    - If there are no recent records -> OFFLINE
    """
    recent_threshold = timezone.now() - timedelta(seconds=RECENT_PRESENCE_SECONDS)

    recent_presences = UserPresence.objects.filter(
        user=user,
        last_seen__gte=recent_threshold,
    )

    if recent_presences.filter(status=UserPresence.Status.ONLINE).exists():
        return UserPresence.Status.ONLINE

    if recent_presences.exists() and not recent_presences.exclude(
        status=UserPresence.Status.AFK
    ).exists():
        return UserPresence.Status.AFK

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
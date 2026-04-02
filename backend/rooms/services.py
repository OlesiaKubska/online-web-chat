from django.core.exceptions import ValidationError
from django.db import transaction, IntegrityError

from friends.services import are_friends, is_user_banned, normalize_user_pair

from .models import Room, RoomMembership, Message


def can_delete_room(user, room):
    """Check if user can delete the room (only owner)."""
    return room.owner_id == user.id


def can_moderate_message(user, message):
    """Check if user can moderate (delete) any message in the room."""
    if message.room.is_direct:
        return False
    return RoomMembership.is_moderator(user, message.room)


def can_delete_own_message(user, message):
    """Check if user can delete their own message."""
    return message.user_id == user.id


def can_delete_message(user, message):
    """Check if user can delete the message (own or as moderator)."""
    if message.room.is_direct:
        return can_delete_own_message(user, message)
    return can_delete_own_message(user, message) or can_moderate_message(user, message)


def can_write_in_direct_dialog(user, room):
    """Return whether a user can write in a direct dialog and an error detail when blocked."""
    if not room.is_direct:
        return True, None

    if room.dm_user1_id == user.id:
        other_user = room.dm_user2
    elif room.dm_user2_id == user.id:
        other_user = room.dm_user1
    else:
        return False, "You are not a participant of this direct dialog."

    if not other_user:
        return False, "Direct dialog participants are invalid."

    if is_user_banned(user, other_user):
        return False, "Direct dialog is read-only because one user banned the other."

    if not are_friends(user, other_user):
        return False, "Direct dialog is read-only because users are no longer friends."

    return True, None


@transaction.atomic
def get_or_create_direct_dialog(user, target_user):
    if user.id == target_user.id:
        raise ValidationError("You cannot create a direct dialog with yourself.")

    if not are_friends(user, target_user):
        raise ValidationError("Direct dialog is allowed only between friends.")

    if is_user_banned(user, target_user):
        raise ValidationError("Cannot create direct dialog because one user banned the other.")

    user1, user2 = normalize_user_pair(user, target_user)

    existing = Room.objects.filter(
        is_direct=True,
        dm_user1=user1,
        dm_user2=user2,
    ).first()
    if existing:
        return existing, False

    try:
        room = Room.objects.create(
            name=f"dm:{user1.id}:{user2.id}",
            description=None,
            visibility=Room.Visibility.PRIVATE,
            owner=user1,
            is_direct=True,
            dm_user1=user1,
            dm_user2=user2,
        )
    except IntegrityError:
        room = Room.objects.get(
            is_direct=True,
            dm_user1=user1,
            dm_user2=user2,
        )
        return room, False

    RoomMembership.objects.create(
        room=room,
        user=user1,
        role=RoomMembership.Role.OWNER,
    )
    RoomMembership.objects.create(
        room=room,
        user=user2,
        role=RoomMembership.Role.MEMBER,
    )

    return room, True
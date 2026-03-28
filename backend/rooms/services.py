from .models import Room, RoomMembership, Message


def can_delete_room(user, room):
    """Check if user can delete the room (only owner)."""
    return room.owner_id == user.id


def can_moderate_message(user, message):
    """Check if user can moderate (delete) any message in the room."""
    return RoomMembership.is_moderator(user, message.room)


def can_delete_own_message(user, message):
    """Check if user can delete their own message."""
    return message.user_id == user.id


def can_delete_message(user, message):
    """Check if user can delete the message (own or as moderator)."""
    return can_delete_own_message(user, message) or can_moderate_message(user, message)
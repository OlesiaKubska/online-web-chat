from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Q

from .models import FriendRequest, Friendship, UserBan


def normalize_user_pair(user_a, user_b):
    if user_a.id == user_b.id:
        raise ValidationError("User pair cannot contain the same user twice.")

    return (user_a, user_b) if user_a.id < user_b.id else (user_b, user_a)


def are_friends(user_a, user_b):
    user1, user2 = normalize_user_pair(user_a, user_b)
    return Friendship.objects.filter(user1=user1, user2=user2).exists()


def is_user_banned(user_a, user_b):
    return UserBan.objects.filter(
        Q(source_user=user_a, target_user=user_b) |
        Q(source_user=user_b, target_user=user_a)
    ).exists()


def send_friend_request(from_user, to_user, message=""):
    message = (message or "").strip()

    if from_user.id == to_user.id:
        raise ValidationError("You cannot send a friend request to yourself.")

    if is_user_banned(from_user, to_user):
        raise ValidationError("Friend request is blocked because one of the users banned the other.")

    if are_friends(from_user, to_user):
        raise ValidationError("Users are already friends.")

    existing_pending = FriendRequest.objects.filter(
        Q(from_user=from_user, to_user=to_user, status=FriendRequest.Status.PENDING) |
        Q(from_user=to_user, to_user=from_user, status=FriendRequest.Status.PENDING)
    ).exists()

    if existing_pending:
        raise ValidationError("A pending friend request already exists between these users.")

    return FriendRequest.objects.create(
        from_user=from_user,
        to_user=to_user,
        message=message,
        status=FriendRequest.Status.PENDING,
    )


@transaction.atomic
def accept_friend_request(friend_request, acting_user):
    if friend_request.to_user_id != acting_user.id:
        raise ValidationError("Only the recipient can accept this friend request.")

    if friend_request.status != FriendRequest.Status.PENDING:
        raise ValidationError("Only pending friend requests can be accepted.")

    if is_user_banned(friend_request.from_user, friend_request.to_user):
        raise ValidationError("Cannot accept friend request because one of the users banned the other.")

    if not are_friends(friend_request.from_user, friend_request.to_user):
        user1, user2 = normalize_user_pair(friend_request.from_user, friend_request.to_user)
        Friendship.objects.create(user1=user1, user2=user2)

    friend_request.status = FriendRequest.Status.ACCEPTED
    friend_request.save(update_fields=["status", "updated_at"])

    return friend_request


def reject_friend_request(friend_request, acting_user):
    if friend_request.to_user_id != acting_user.id:
        raise ValidationError("Only the recipient can reject this friend request.")

    if friend_request.status != FriendRequest.Status.PENDING:
        raise ValidationError("Only pending friend requests can be rejected.")

    friend_request.status = FriendRequest.Status.REJECTED
    friend_request.save(update_fields=["status", "updated_at"])

    return friend_request


def cancel_friend_request(friend_request, acting_user):
    if friend_request.from_user_id != acting_user.id:
        raise ValidationError("Only the sender can cancel this friend request.")

    if friend_request.status != FriendRequest.Status.PENDING:
        raise ValidationError("Only pending friend requests can be canceled.")

    friend_request.status = FriendRequest.Status.CANCELED
    friend_request.save(update_fields=["status", "updated_at"])

    return friend_request


def remove_friendship(user_a, user_b):
    user1, user2 = normalize_user_pair(user_a, user_b)
    deleted_count, _ = Friendship.objects.filter(user1=user1, user2=user2).delete()
    return deleted_count > 0

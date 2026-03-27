from django.core.exceptions import ValidationError
from django.db import transaction, models
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


def get_friends_queryset(user):
    """
    Get queryset of friends for a user, excluding banned users.
    """
    # Find all friendships where the current user is either user1 or user2
    friendships = Friendship.objects.filter(
        Q(user1=user) | Q(user2=user)
    ).select_related('user1', 'user2')
    
    # Get the "other user" from each friendship, excluding banned users
    friends = []
    for friendship in friendships:
        other_user = friendship.user2 if friendship.user1 == user else friendship.user1
        # Skip if either user has banned the other
        if not is_user_banned(user, other_user):
            friends.append(other_user)
    
    return friends


def send_friend_request(from_user, to_user, message=""):
    message = (message or "").strip()

    if from_user.id == to_user.id:
        raise ValidationError("You cannot send a friend request to yourself.")

    if is_user_banned(from_user, to_user):
        raise ValidationError("User is banned.")

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


@transaction.atomic
def ban_user(source_user, target_user):
    if source_user.id == target_user.id:
        raise ValidationError("You cannot ban yourself.")

    # Check if ban already exists
    if UserBan.objects.filter(source_user=source_user, target_user=target_user).exists():
        raise ValidationError("User is already banned.")

    # Create the ban record
    UserBan.objects.create(source_user=source_user, target_user=target_user)

    # Remove friendship if it exists
    remove_friendship(source_user, target_user)

    # Cancel any pending friend requests between the two users (both directions)
    FriendRequest.objects.filter(
        Q(from_user=source_user, to_user=target_user, status=FriendRequest.Status.PENDING) |
        Q(from_user=target_user, to_user=source_user, status=FriendRequest.Status.PENDING)
    ).update(status=FriendRequest.Status.CANCELED, updated_at=models.functions.Now())

    return True


def unban_user(source_user, target_user):
    if source_user.id == target_user.id:
        raise ValidationError("You cannot unban yourself.")

    # Check if ban exists
    deleted_count, _ = UserBan.objects.filter(source_user=source_user, target_user=target_user).delete()
    if deleted_count == 0:
        raise ValidationError("No ban exists between these users.")

    return True

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q, F


class FriendRequest(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        REJECTED = "rejected", "Rejected"
        CANCELED = "canceled", "Canceled"

    from_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sent_friend_requests",
    )
    to_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_friend_requests",
    )
    message = models.TextField(blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if self.from_user_id == self.to_user_id:
            raise ValidationError("You cannot send a friend request to yourself.")

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=~Q(from_user=F("to_user")),
                name="friend_request_not_to_self",
            ),
            models.UniqueConstraint(
                fields=["from_user", "to_user"],
                condition=Q(status="pending"),
                name="unique_pending_friend_request",
            ),
        ]

    def __str__(self):
        return f"{self.from_user} -> {self.to_user} ({self.status})"


class Friendship(models.Model):
    user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="friendships_as_user1",
    )
    user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="friendships_as_user2",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.user1_id == self.user2_id:
            raise ValidationError("You cannot be friends with yourself.")
        if self.user1_id and self.user2_id and self.user1_id > self.user2_id:
            raise ValidationError("Friendship users must be stored in sorted order.")

    def save(self, *args, **kwargs):
        if self.user1_id and self.user2_id and self.user1_id > self.user2_id:
            self.user1_id, self.user2_id = self.user2_id, self.user1_id
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=~Q(user1=F("user2")),
                name="friendship_not_to_self",
            ),
            models.CheckConstraint(
                condition=Q(user1__lt=F("user2")),
                name="friendship_sorted_users",
            ),
            models.UniqueConstraint(
                fields=["user1", "user2"],
                name="unique_friendship_pair",
            ),
        ]

    def __str__(self):
        return f"{self.user1} <-> {self.user2}"


class UserBan(models.Model):
    source_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="issued_user_bans",
    )
    target_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="received_user_bans",
    )
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.source_user_id == self.target_user_id:
            raise ValidationError("You cannot ban yourself.")

    class Meta:
        constraints = [
            models.CheckConstraint(
                condition=~Q(source_user=F("target_user")),
                name="user_ban_not_to_self",
            ),
            models.UniqueConstraint(
                fields=["source_user", "target_user"],
                name="unique_user_ban_pair",
            ),
        ]

    def __str__(self):
        return f"{self.source_user} banned {self.target_user}"

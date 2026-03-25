from django.conf import settings
from django.db import models
from django.db.models import UniqueConstraint
from django.db.models.functions import Lower


class Room(models.Model):
    class Visibility(models.TextChoices):
        PUBLIC = 'public', 'Public'
        PRIVATE = 'private', 'Private'

    name = models.CharField(max_length=50)
    description = models.TextField(blank=True, null=True)
    visibility = models.CharField(
        max_length=10,
        choices=Visibility.choices,
        default=Visibility.PUBLIC,
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_rooms',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            UniqueConstraint(
                Lower('name'),
                name='unique_room_name_case_insensitive',
            )
        ]
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class RoomMembership(models.Model):
    class Role(models.TextChoices):
        OWNER = 'owner', 'Owner'
        MEMBER = 'member', 'Member'

    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='memberships',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='room_memberships',
    )
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.MEMBER,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['room', 'user'],
                name='unique_room_membership',
            )
        ]

    def __str__(self):
        return f'{self.user} in {self.room} ({self.role})'


class Message(models.Model):
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    content = models.TextField()
    reply_to = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='replies',
    )
    edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'Message {self.id} by {self.user} in room {self.room_id}'
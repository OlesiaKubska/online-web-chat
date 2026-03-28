from django.conf import settings
from django.core.exceptions import ValidationError
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
        ADMIN = 'admin', 'Admin'
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

    @classmethod
    def is_owner(cls, user, room):
        return cls.objects.filter(room=room, user=user, role=cls.Role.OWNER).exists()

    @classmethod
    def is_admin(cls, user, room):
        return cls.objects.filter(room=room, user=user, role=cls.Role.ADMIN).exists()

    @classmethod
    def is_moderator(cls, user, room):
        return cls.objects.filter(
            room=room, 
            user=user, 
            role__in=[cls.Role.OWNER, cls.Role.ADMIN]
        ).exists()


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


class RoomBan(models.Model):
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name='bans',
    )
    banned_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='room_bans',
    )
    banned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='issued_room_bans',
    )
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        if self.room.owner_id == self.banned_user_id:
            raise ValidationError("Cannot ban the room owner.")

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['room', 'banned_user'],
                name='unique_room_ban',
            ),
        ]
        indexes = [
            models.Index(fields=['room', 'banned_user']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.banned_user} banned from {self.room} by {self.banned_by}"


class MessageAttachment(models.Model):
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name="attachments",
    )
    file = models.FileField(upload_to="chat_attachments/")
    original_name = models.CharField(max_length=255)
    comment = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.original_name

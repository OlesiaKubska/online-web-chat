from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import UniqueConstraint, Q, F
from django.db.models.functions import Lower


MAX_ROOM_PARTICIPANTS = 1000
MAX_ATTACHMENT_FILE_SIZE_BYTES = 20 * 1024 * 1024
MAX_ATTACHMENT_IMAGE_SIZE_BYTES = 3 * 1024 * 1024


def validate_attachment_upload(uploaded_file):
    if not uploaded_file:
        return uploaded_file

    file_size = getattr(uploaded_file, "size", 0) or 0
    content_type = (getattr(uploaded_file, "content_type", "") or "").lower()

    if content_type.startswith("image/") and file_size > MAX_ATTACHMENT_IMAGE_SIZE_BYTES:
        raise ValidationError("Images cannot exceed 3 MB.")

    if file_size > MAX_ATTACHMENT_FILE_SIZE_BYTES:
        raise ValidationError("Files cannot exceed 20 MB.")

    return uploaded_file


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
    is_direct = models.BooleanField(default=False)
    dm_user1 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='direct_rooms_as_user1',
        null=True,
        blank=True,
    )
    dm_user2 = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='direct_rooms_as_user2',
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def clean(self):
        if not self.is_direct:
            return

        if self.visibility != self.Visibility.PRIVATE:
            raise ValidationError("Direct dialogs must be private.")

        if not self.dm_user1_id or not self.dm_user2_id:
            raise ValidationError("Direct dialogs must have exactly two participants.")

        if self.dm_user1_id == self.dm_user2_id:
            raise ValidationError("Direct dialog participants must be different users.")

        if self.dm_user1_id > self.dm_user2_id:
            raise ValidationError("Direct dialog users must be stored in sorted order.")

    def save(self, *args, **kwargs):
        if self.is_direct and self.dm_user1_id and self.dm_user2_id and self.dm_user1_id > self.dm_user2_id:
            self.dm_user1_id, self.dm_user2_id = self.dm_user2_id, self.dm_user1_id
        super().save(*args, **kwargs)

    class Meta:
        constraints = [
            UniqueConstraint(
                Lower('name'),
                name='unique_room_name_case_insensitive',
            ),
            models.CheckConstraint(
                condition=Q(is_direct=False) | (Q(dm_user1__isnull=False) & Q(dm_user2__isnull=False)),
                name='direct_room_requires_two_users',
            ),
            models.CheckConstraint(
                condition=Q(is_direct=False) | Q(dm_user1__lt=F('dm_user2')),
                name='direct_room_sorted_users',
            ),
            models.UniqueConstraint(
                fields=['dm_user1', 'dm_user2'],
                condition=Q(is_direct=True),
                name='unique_direct_room_pair',
            ),
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
    last_read_at = models.DateTimeField(null=True, blank=True)
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
        indexes = [
            models.Index(fields=['room', '-created_at'], name='message_room_created_idx'),
        ]

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
    file = models.FileField(
        upload_to="chat_attachments/",
        validators=[validate_attachment_upload],
    )
    original_name = models.CharField(max_length=255)
    comment = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def clean(self):
        super().clean()
        validate_attachment_upload(self.file)

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)

    def __str__(self):
        return self.original_name

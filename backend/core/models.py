from django.conf import settings
from django.db import models


class UserPresence(models.Model):
    class Status(models.TextChoices):
        ONLINE = "online", "Online"
        AFK = "afk", "Away from keyboard"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="presences",
    )
    session_id = models.CharField(max_length=128)
    tab_id = models.CharField(max_length=128)
    status = models.CharField(
        max_length=10,
        choices=Status.choices,
        default=Status.ONLINE,
    )
    last_seen = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "session_id", "tab_id"],
                name="unique_user_session_tab_presence",
            )
        ]
        indexes = [
            models.Index(fields=["user", "last_seen"]),
            models.Index(fields=["last_seen"]),
            models.Index(fields=["user", "session_id", "tab_id"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.status} ({self.tab_id})"
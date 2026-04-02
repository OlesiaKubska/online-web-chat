from django.conf import settings
from django.db import models


class UserSessionMeta(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="session_meta",
    )
    session_key = models.CharField(max_length=40, unique=True)
    user_agent = models.TextField(blank=True, default="")
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    last_seen = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["user", "last_seen"]),
        ]

    def __str__(self):
        return f"{self.user_id}:{self.session_key}"

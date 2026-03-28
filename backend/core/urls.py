from django.urls import path

from .views import HealthCheckView, PresenceHeartbeatView, PresenceUsersView

urlpatterns = [
    path("", HealthCheckView.as_view(), name="health-check"),
    path("presence/heartbeat/", PresenceHeartbeatView.as_view(), name="presence-heartbeat"),
    path("presence/users/", PresenceUsersView.as_view(), name="presence-users"),
]
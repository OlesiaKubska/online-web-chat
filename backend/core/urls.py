from django.urls import path
from .views import health_check, presence_heartbeat, presence_users

urlpatterns = [
    path('health/', health_check),
    path('presence/heartbeat/', presence_heartbeat),
    path('presence/users/', presence_users),
]
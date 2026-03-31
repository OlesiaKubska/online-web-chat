from rest_framework import serializers

from .models import UserPresence


class PresenceHeartbeatSerializer(serializers.Serializer):
    session_id = serializers.CharField(max_length=255)
    tab_id = serializers.CharField(max_length=255)
    status = serializers.ChoiceField(choices=UserPresence.Status.choices)


class PresenceResponseSerializer(serializers.Serializer):
    user_id = serializers.IntegerField()
    status = serializers.CharField()


class PresenceTabCloseSerializer(serializers.Serializer):
    session_id = serializers.CharField(max_length=255)
    tab_id = serializers.CharField(max_length=255)
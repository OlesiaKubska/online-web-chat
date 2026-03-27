from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import FriendRequest
from .services import send_friend_request

User = get_user_model()


class FriendRequestCreateSerializer(serializers.Serializer):
    to_user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all())
    message = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        request = self.context["request"]
        from_user = request.user
        to_user = validated_data["to_user"]
        message = validated_data.get("message", "")

        return send_friend_request(
            from_user=from_user,
            to_user=to_user,
            message=message,
        )


class FriendRequestSerializer(serializers.ModelSerializer):
    from_username = serializers.CharField(source="from_user.username", read_only=True)
    to_username = serializers.CharField(source="to_user.username", read_only=True)

    class Meta:
        model = FriendRequest
        fields = [
            "id",
            "from_user",
            "from_username",
            "to_user",
            "to_username",
            "message",
            "status",
            "created_at",
            "updated_at",
        ]


class FriendSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email"]
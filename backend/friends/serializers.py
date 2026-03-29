from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import FriendRequest
from .services import send_friend_request

User = get_user_model()


class FriendRequestCreateSerializer(serializers.Serializer):
    username = serializers.CharField(required=False, allow_blank=False)
    to_user = serializers.PrimaryKeyRelatedField(queryset=User.objects.all(), required=False)
    message = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        username = attrs.get("username")
        to_user = attrs.get("to_user")

        if username:
            username = username.strip()
            try:
                target_user = User.objects.get(username=username)
            except User.DoesNotExist:
                raise serializers.ValidationError({
                    "username": "User with this username does not exist."
                })

            attrs["resolved_to_user"] = target_user
            attrs["username"] = username
            return attrs

        if to_user:
            attrs["resolved_to_user"] = to_user
            return attrs

        raise serializers.ValidationError({
            "username": "This field is required."
        })

    def create(self, validated_data):
        request = self.context["request"]
        from_user = request.user
        to_user = validated_data["resolved_to_user"]
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
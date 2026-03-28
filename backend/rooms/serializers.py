from django.db import transaction
from rest_framework import serializers
from .models import Room, RoomMembership, Message, RoomBan, MessageAttachment


class RoomSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    member_count = serializers.SerializerMethodField()
    joined = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = [
            'id',
            'name',
            'description',
            'visibility',
            'owner',
            'owner_username',
            'member_count',
            'joined',
            'my_role',
            'created_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at']

    def get_member_count(self, obj):
        return obj.memberships.count()

    def get_joined(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        return obj.memberships.filter(user=request.user).exists()

    def get_my_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        membership = obj.memberships.filter(user=request.user).first()
        if not membership:
            return None
        return membership.role


class CreateRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['name', 'description', 'visibility']

    def validate_name(self, value):
        value = value.strip()

        if len(value) < 3:
            raise serializers.ValidationError('Room name must be at least 3 characters long.')

        if len(value) > 50:
            raise serializers.ValidationError('Room name must be at most 50 characters long.')

        if Room.objects.filter(name__iexact=value).exists():
            raise serializers.ValidationError('Room with this name already exists.')

        return value

    def validate_description(self, value):
        if value is None:
            return None

        value = value.strip()
        return value or None

    @transaction.atomic
    def create(self, validated_data):
        user = self.context['request'].user

        room = Room.objects.create(
            owner=user,
            **validated_data,
        )

        RoomMembership.objects.create(
            room=room,
            user=user,
            role=RoomMembership.Role.OWNER,
        )

        return room


class MessageAttachmentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = MessageAttachment
        fields = ["id", "original_name", "comment", "file_url", "created_at"]

    def get_file_url(self, obj):
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(obj.file.url)
        return obj.file.url


class MessageSerializer(serializers.ModelSerializer):
    user_username = serializers.CharField(source='user.username', read_only=True)
    reply_to_message = serializers.SerializerMethodField()
    attachments = MessageAttachmentSerializer(many=True, read_only=True)


    class Meta:
        model = Message
        fields = [
            'id',
            'room',
            'user',
            'user_username',
            'content',
            'reply_to',
            'reply_to_message',
            'edited',
            'created_at',
            'updated_at',
            'attachments',
        ]
        read_only_fields = [
            'id',
            'room',
            'user',
            'user_username',
            'edited',
            'created_at',
            'updated_at',
            'attachments',
        ]

    def get_reply_to_message(self, obj):
        if not obj.reply_to:
            return None

        return {
            'id': obj.reply_to.id,
            'content': obj.reply_to.content,
            'user': obj.reply_to.user_id,
            'user_username': obj.reply_to.user.username,
        }


class CreateMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['content', 'reply_to']

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Message content cannot be empty.')
        return value

    def validate_reply_to(self, value):
        room = self.context.get('room')
        if value and value.room_id != room.id:
            raise serializers.ValidationError('Reply target must belong to the same room.')
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        room = self.context['room']

        return Message.objects.create(
            room=room,
            user=user,
            **validated_data,
        )


class UpdateMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['content']

    def validate_content(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError('Message content cannot be empty.')
        return value

    def update(self, instance, validated_data):
        instance.content = validated_data['content']
        instance.edited = True
        instance.save(update_fields=['content', 'edited', 'updated_at'])
        return instance


class RoomBanSerializer(serializers.ModelSerializer):
    banned_username = serializers.CharField(source='banned_user.username', read_only=True)
    banned_by_username = serializers.CharField(source='banned_by.username', read_only=True)

    class Meta:
        model = RoomBan
        fields = [
            'id',
            'room',
            'banned_user',
            'banned_username',
            'banned_by',
            'banned_by_username',
            'reason',
            'created_at',
        ]
        read_only_fields = ['id', 'room', 'banned_by', 'created_at']


class CreateRoomBanSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        room = self.context['room']
        banned_user = self.context['banned_user']
        banned_by = self.context['request'].user

        return RoomBan.objects.create(
            room=room,
            banned_user=banned_user,
            banned_by=banned_by,
            reason=validated_data.get('reason', ''),
        )
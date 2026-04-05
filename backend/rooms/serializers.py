from django.db import transaction
from django.urls import reverse
from rest_framework import serializers
from .models import Room, RoomMembership, Message, RoomBan, MessageAttachment
from .services import can_write_in_direct_dialog


MAX_MESSAGE_SIZE_BYTES = 3 * 1024


def validate_message_content_size(value: str) -> str:
    encoded_length = len(value.encode('utf-8'))
    if encoded_length > MAX_MESSAGE_SIZE_BYTES:
        raise serializers.ValidationError('Message content cannot exceed 3 KB.')
    return value


class RoomMembershipSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = RoomMembership
        fields = ['id', 'user_id', 'username', 'role', 'created_at']
        read_only_fields = ['id', 'user_id', 'username', 'created_at']


class RoomSerializer(serializers.ModelSerializer):
    owner_username = serializers.CharField(source='owner.username', read_only=True)
    member_count = serializers.SerializerMethodField()
    joined = serializers.SerializerMethodField()
    my_role = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    can_send_messages = serializers.SerializerMethodField()
    write_restriction_reason = serializers.SerializerMethodField()
    is_direct = serializers.BooleanField(read_only=True)
    dm_user1 = serializers.IntegerField(source='dm_user1_id', read_only=True)
    dm_user2 = serializers.IntegerField(source='dm_user2_id', read_only=True)
    dm_user1_username = serializers.CharField(source='dm_user1.username', read_only=True, allow_null=True)
    dm_user2_username = serializers.CharField(source='dm_user2.username', read_only=True, allow_null=True)

    class Meta:
        model = Room
        fields = [
            'id',
            'name',
            'description',
            'visibility',
            'owner',
            'owner_username',
            'is_direct',
            'dm_user1',
            'dm_user2',
               'dm_user1_username',
               'dm_user2_username',
            'member_count',
            'joined',
            'my_role',
            'unread_count',
            'can_send_messages',
            'write_restriction_reason',
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

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0

        membership = obj.memberships.filter(user=request.user).first()
        if not membership:
            return 0

        unread_messages = obj.messages.exclude(user=request.user)
        if membership.last_read_at:
            unread_messages = unread_messages.filter(created_at__gt=membership.last_read_at)

        return unread_messages.count()

    def get_can_send_messages(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False

        if not obj.memberships.filter(user=request.user).exists():
            return False

        if not obj.is_direct:
            return True

        can_write, _ = can_write_in_direct_dialog(request.user, obj)
        return can_write

    def get_write_restriction_reason(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None

        if not obj.memberships.filter(user=request.user).exists():
            return None

        if not obj.is_direct:
            return None

        can_write, detail = can_write_in_direct_dialog(request.user, obj)
        return None if can_write else detail


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
        url = reverse('message-attachment-download', kwargs={'pk': obj.id})
        if request:
            return request.build_absolute_uri(url)
        return url


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
        return validate_message_content_size(value)

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
        return validate_message_content_size(value)

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

    def validate(self, attrs):
        room = self.context['room']
        banned_user = self.context['banned_user']

        if banned_user.id == room.owner_id:
            raise serializers.ValidationError('Cannot ban the room owner.')

        if RoomBan.objects.filter(room=room, banned_user=banned_user).exists():
            raise serializers.ValidationError('User is already banned from this room.')

        return attrs

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


class DirectDialogCreateSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(min_value=1)
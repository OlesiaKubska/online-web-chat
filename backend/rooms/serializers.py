from django.db import transaction
from rest_framework import serializers
from .models import Room, RoomMembership


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
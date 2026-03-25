from django.contrib import admin
from .models import Room, RoomMembership, Message


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'visibility', 'owner', 'created_at')
    search_fields = ('name', 'description', 'owner__username')
    list_filter = ('visibility',)


@admin.register(RoomMembership)
class RoomMembershipAdmin(admin.ModelAdmin):
    list_display = ('id', 'room', 'user', 'role', 'created_at')
    search_fields = ('room__name', 'user__username')
    list_filter = ('role',)


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'room', 'user', 'short_content', 'edited', 'created_at')
    search_fields = ('content', 'user__username', 'room__name')
    list_filter = ('edited', 'created_at')

    def short_content(self, obj):
        return obj.content[:50]
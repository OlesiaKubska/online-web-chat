from django.contrib import admin
from .models import Room, RoomMembership


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
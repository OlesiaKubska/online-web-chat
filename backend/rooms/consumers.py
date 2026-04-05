import json

from asgiref.sync import sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer
from django.contrib.auth.models import AnonymousUser

from .models import Room, RoomMembership, Message
from .serializers import MessageSerializer, MAX_MESSAGE_SIZE_BYTES
from .services import can_write_in_direct_dialog


class RoomChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.room_id = self.scope["url_route"]["kwargs"]["room_id"]
        self.group_name = f"room_{self.room_id}"

        if isinstance(self.user, AnonymousUser) or not self.user.is_authenticated:
            await self.close(code=4001)
            return

        room = await self.get_room(self.room_id)
        if not room:
            await self.close(code=4004)
            return

        is_member = await self.is_room_member(room, self.user)
        if not is_member:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if not text_data:
            return

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send_json({
                "type": "error",
                "detail": "Invalid JSON payload.",
            })
            return

        action = data.get("action", "send_message")

        if action == "send_message":
            await self.handle_send_message(data)
            return

        await self.send_json({
            "type": "error",
            "detail": "Unsupported action.",
        })

    async def handle_send_message(self, data):
        content = (data.get("content") or "").strip()
        reply_to_id = data.get("reply_to")

        if not content:
            await self.send_json({
                "type": "error",
                "detail": "Message content cannot be empty.",
            })
            return

        if len(content.encode("utf-8")) > MAX_MESSAGE_SIZE_BYTES:
            await self.send_json({
                "type": "error",
                "detail": "Message content cannot exceed 3 KB.",
            })
            return

        room = await self.get_room(self.room_id)
        if not room:
            await self.send_json({
                "type": "error",
                "detail": "Room not found.",
            })
            return

        can_write, detail = await self.can_write_in_direct_dialog(room, self.user)
        if not can_write:
            await self.send_json({
                "type": "error",
                "detail": detail,
            })
            return

        reply_to = None
        if reply_to_id is not None:
            reply_to = await self.get_reply_message(reply_to_id, room.id)
            if reply_to is None:
                await self.send_json({
                    "type": "error",
                    "detail": "Reply target must belong to the same room.",
                })
                return

        message = await self.create_message(
            room=room,
            user=self.user,
            content=content,
            reply_to=reply_to,
        )

        serialized_message = await self.serialize_message(message)

        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "chat_message",
                "message": serialized_message,
            },
        )

    async def chat_message(self, event):
        await self.send_json({
            "type": "message",
            "message": event["message"],
        })

    async def send_json(self, data):
        await self.send(text_data=json.dumps(data))

    @sync_to_async
    def get_room(self, room_id):
        try:
            return Room.objects.get(pk=room_id)
        except Room.DoesNotExist:
            return None

    @sync_to_async
    def is_room_member(self, room, user):
        return RoomMembership.objects.filter(room=room, user=user).exists()

    @sync_to_async
    def get_reply_message(self, reply_to_id, room_id):
        try:
            return Message.objects.select_related("user").get(
                pk=reply_to_id,
                room_id=room_id,
            )
        except Message.DoesNotExist:
            return None

    @sync_to_async
    def create_message(self, room, user, content, reply_to=None):
        return Message.objects.create(
            room=room,
            user=user,
            content=content,
            reply_to=reply_to,
        )

    @sync_to_async
    def serialize_message(self, message):
        message = Message.objects.select_related(
            "user",
            "reply_to",
            "reply_to__user",
        ).prefetch_related("attachments").get(pk=message.pk)
        return MessageSerializer(message).data

    @sync_to_async
    def can_write_in_direct_dialog(self, room, user):
        return can_write_in_direct_dialog(user, room)
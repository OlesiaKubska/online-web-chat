from django.db.models import Q
from django.core.exceptions import ValidationError as DjangoValidationError
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils.dateparse import parse_datetime
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from rest_framework import generics, status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, NotFound

from .models import Room, RoomMembership, Message, RoomBan, MessageAttachment
from .serializers import (
    RoomSerializer,
    CreateRoomSerializer,
    DirectDialogCreateSerializer,
    MessageSerializer,
    CreateMessageSerializer,
    UpdateMessageSerializer,
    RoomBanSerializer,
    CreateRoomBanSerializer,
    MessageAttachmentSerializer,
    RoomMembershipSerializer,
)
from core.authentication import CsrfExemptSessionAuthentication


def ensure_room_member(room, user):
    is_member = room.memberships.filter(user=user).exists()
    if not is_member:
        raise PermissionDenied('You are not a member of this room.')


def ensure_room_moderator(room, user):
    if not RoomMembership.is_moderator(user, room):
        raise PermissionDenied('You do not have permission to moderate this room.')


@method_decorator(csrf_exempt, name='dispatch')
class RoomCreateView(generics.CreateAPIView):
    serializer_class = CreateRoomSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        room = serializer.save()

        output_serializer = RoomSerializer(room, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class PublicRoomListView(generics.ListAPIView):
    serializer_class = RoomSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Room.objects.filter(
            visibility=Room.Visibility.PUBLIC,
            is_direct=False,
        ).select_related('owner').prefetch_related('memberships')

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(description__icontains=search)
            )

        return queryset


class MyRoomListView(generics.ListAPIView):
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Room.objects.filter(
            memberships__user=self.request.user,
            is_direct=False,
        ).select_related('owner').prefetch_related('memberships').distinct()


@method_decorator(csrf_exempt, name='dispatch')
class DirectDialogListView(generics.ListAPIView):
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_queryset(self):
        return Room.objects.filter(
            is_direct=True,
            memberships__user=self.request.user,
        ).select_related('owner', 'dm_user1', 'dm_user2').prefetch_related('memberships').distinct()


@method_decorator(csrf_exempt, name='dispatch')
class DirectDialogCreateOrGetView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        serializer = DirectDialogCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target_user_id = serializer.validated_data['user_id']
        User = get_user_model()

        try:
            target_user = User.objects.get(pk=target_user_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)

        from .services import get_or_create_direct_dialog

        try:
            room, created = get_or_create_direct_dialog(request.user, target_user)
        except DjangoValidationError as exc:
            return Response({'detail': exc.message}, status=status.HTTP_400_BAD_REQUEST)

        output = RoomSerializer(room, context={'request': request})
        response_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(output.data, status=response_status)


class RoomDetailView(generics.RetrieveAPIView):
    serializer_class = RoomSerializer
    permission_classes = [IsAuthenticated]
    queryset = Room.objects.select_related('owner').prefetch_related('memberships')

    def get_object(self):
        room = super().get_object()
        user = self.request.user

        if room.visibility == Room.Visibility.PUBLIC:
            return room

        is_member = room.memberships.filter(user=user).exists()
        if not is_member:
            raise PermissionDenied('You do not have access to this private room.')

        return room

    def delete(self, request, *args, **kwargs):
        room = self.get_object()
        from .services import can_delete_room
        if not can_delete_room(request.user, room):
            raise PermissionDenied('Only the room owner can delete the room.')
        
        room.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_exempt, name='dispatch')
class JoinRoomView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request, pk):
        try:
            room = Room.objects.get(pk=pk)
        except Room.DoesNotExist:
            return Response({'detail': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        if room.visibility != Room.Visibility.PUBLIC:
            return Response(
                {'detail': 'You cannot join a private room directly.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if user is banned
        if RoomBan.objects.filter(room=room, banned_user=request.user).exists():
            return Response(
                {'detail': 'You are banned from this room.'},
                status=status.HTTP_403_FORBIDDEN
            )

        membership, created = RoomMembership.objects.get_or_create(
            room=room,
            user=request.user,
            defaults={'role': RoomMembership.Role.MEMBER}
        )

        return Response({
            'detail': 'Joined room successfully.',
            'joined': True,
            'created': created,
            'role': membership.role,
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class LeaveRoomView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request, pk):
        try:
            room = Room.objects.get(pk=pk)
        except Room.DoesNotExist:
            return Response({'detail': 'Room not found.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            membership = RoomMembership.objects.get(room=room, user=request.user)
        except RoomMembership.DoesNotExist:
            return Response(
                {'detail': 'You are not a member of this room.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if membership.role == RoomMembership.Role.OWNER:
            return Response(
                {'detail': 'Owner cannot leave own room.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        membership.delete()

        return Response({'detail': 'Left room successfully.'}, status=status.HTTP_200_OK)


class RoomMessageListCreateView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_room(self, pk):
        try:
            return Room.objects.get(pk=pk)
        except Room.DoesNotExist:
            raise NotFound('Room not found.')

    def get(self, request, pk):
        room = self.get_room(pk)
        ensure_room_member(room, request.user)

        messages = Message.objects.filter(room=room).select_related(
            'user',
            'reply_to',
            'reply_to__user',
        )

        cursor = request.query_params.get('cursor')
        if cursor:
            parsed_cursor = parse_datetime(cursor)
            if parsed_cursor:
                messages = messages.filter(created_at__lt=parsed_cursor)

        messages = messages.order_by('-created_at')[:20]

        serializer = MessageSerializer(messages, many=True, context={"request": request},)
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk):
        room = self.get_room(pk)
        ensure_room_member(room, request.user)

        serializer = CreateMessageSerializer(
            data=request.data,
            context={
                'request': request,
                'room': room,
            },
        )
        serializer.is_valid(raise_exception=True)
        message = serializer.save()

        output_serializer = MessageSerializer(message, context={"request": request},)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class MessageDetailView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_message(self, pk):
        try:
            return Message.objects.select_related('room', 'user').get(pk=pk)
        except Message.DoesNotExist:
            raise NotFound('Message not found.')

    def patch(self, request, pk):
        message = self.get_message(pk)

        if message.user_id != request.user.id:
            raise PermissionDenied('You can edit only your own messages.')

        serializer = UpdateMessageSerializer(message, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_message = serializer.save()

        output_serializer = MessageSerializer(updated_message, context={"request": request},)
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        message = self.get_message(pk)

        from .services import can_delete_message
        if not can_delete_message(request.user, message):
            raise PermissionDenied('You do not have permission to delete this message.')

        message.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_exempt, name='dispatch')
class ModerationDeleteMessageView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_message(self, pk):
        try:
            return Message.objects.select_related('room', 'user').get(pk=pk)
        except Message.DoesNotExist:
            raise NotFound('Message not found.')

    def delete(self, request, pk):
        message = self.get_message(pk)

        from .services import can_moderate_message
        if not can_moderate_message(request.user, message):
            raise PermissionDenied('You do not have permission to moderate messages in this room.')

        message.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_exempt, name='dispatch')
class BanUserView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_room(self, pk):
        try:
            return Room.objects.get(pk=pk)
        except Room.DoesNotExist:
            raise NotFound('Room not found.')

    def get_user(self, user_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise NotFound('User not found.')

    def post(self, request, pk, user_id):
        room = self.get_room(pk)
        banned_user = self.get_user(user_id)

        ensure_room_moderator(room, request.user)

        if banned_user.id == request.user.id:
            return Response({'detail': 'You cannot ban yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        if banned_user.id == room.owner_id:
            return Response({'detail': 'Cannot ban the room owner.'}, status=status.HTTP_400_BAD_REQUEST)

        serializer = CreateRoomBanSerializer(
            data=request.data,
            context={'request': request, 'room': room, 'banned_user': banned_user}
        )
        serializer.is_valid(raise_exception=True)
        try:
            ban = serializer.save()
        except IntegrityError:
            return Response(
                {'detail': 'User is already banned from this room.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Remove from membership if present
        RoomMembership.objects.filter(room=room, user=banned_user).delete()

        output_serializer = RoomBanSerializer(ban)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


@method_decorator(csrf_exempt, name='dispatch')
class UnbanUserView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_room(self, pk):
        try:
            return Room.objects.get(pk=pk)
        except Room.DoesNotExist:
            raise NotFound('Room not found.')

    def delete(self, request, pk, user_id):
        room = self.get_room(pk)
        ensure_room_moderator(room, request.user)

        try:
            ban = RoomBan.objects.get(room=room, banned_user_id=user_id)
        except RoomBan.DoesNotExist:
            return Response({'detail': 'User is not banned from this room.'}, status=status.HTTP_404_NOT_FOUND)

        ban.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_exempt, name='dispatch')
class RemoveMemberView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_room(self, pk):
        try:
            return Room.objects.get(pk=pk)
        except Room.DoesNotExist:
            raise NotFound('Room not found.')

    def get_user(self, user_id):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            raise NotFound('User not found.')

    def delete(self, request, pk, user_id):
        room = self.get_room(pk)
        member_user = self.get_user(user_id)

        ensure_room_moderator(room, request.user)

        if member_user.id == request.user.id:
            return Response({'detail': 'You cannot remove yourself.'}, status=status.HTTP_400_BAD_REQUEST)

        # Check if user is a member
        membership = RoomMembership.objects.filter(room=room, user=member_user).first()
        if not membership:
            return Response({'detail': 'User is not a member of this room.'}, status=status.HTTP_400_BAD_REQUEST)

        if membership.role == RoomMembership.Role.OWNER:
            return Response({'detail': 'Cannot remove the room owner.'}, status=status.HTTP_400_BAD_REQUEST)

        existing_ban = RoomBan.objects.filter(room=room, banned_user=member_user).first()
        if existing_ban:
            membership.delete()
            output_serializer = RoomBanSerializer(existing_ban)
            return Response(output_serializer.data, status=status.HTTP_200_OK)

        # Create ban (reason can be from request data if provided)
        reason = request.data.get('reason', 'Removed by moderator')
        try:
            ban = RoomBan.objects.create(
                room=room,
                banned_user=member_user,
                banned_by=request.user,
                reason=reason,
            )
        except IntegrityError:
            return Response(
                {'detail': 'User is already banned from this room.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Remove membership
        membership.delete()

        output_serializer = RoomBanSerializer(ban)
        return Response(output_serializer.data, status=status.HTTP_200_OK)


class RoomBansListView(generics.ListAPIView):
    serializer_class = RoomBanSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        room_id = self.kwargs['pk']
        room = Room.objects.filter(pk=room_id).first()
        if not room:
            return RoomBan.objects.none()

        # Only moderators can see bans
        if not RoomMembership.is_moderator(self.request.user, room):
            return RoomBan.objects.none()

        return RoomBan.objects.filter(room=room).select_related('banned_user', 'banned_by')


class RoomMemberListView(generics.ListAPIView):
    serializer_class = RoomMembershipSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        room_id = self.kwargs['pk']
        try:
            room = Room.objects.get(pk=room_id)
        except Room.DoesNotExist:
            raise NotFound('Room not found.')
        ensure_room_member(room, self.request.user)
        return RoomMembership.objects.filter(room=room).select_related('user').order_by('created_at')


@method_decorator(csrf_exempt, name='dispatch')
class UpdateMemberRoleView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def patch(self, request, pk, user_id):
        room = get_object_or_404(Room, pk=pk)

        if not RoomMembership.is_owner(request.user, room):
            raise PermissionDenied('Only the room owner can change member roles.')

        membership = get_object_or_404(RoomMembership, room=room, user_id=user_id)

        if membership.role == RoomMembership.Role.OWNER:
            return Response(
                {'detail': 'Cannot change the role of the room owner.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if membership.user_id == request.user.id:
            return Response(
                {'detail': 'Cannot change your own role.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        new_role = request.data.get('role')
        if new_role not in (RoomMembership.Role.ADMIN, RoomMembership.Role.MEMBER):
            return Response(
                {'detail': 'Role must be "admin" or "member".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership.role = new_role
        membership.save(update_fields=['role'])

        serializer = RoomMembershipSerializer(membership)
        return Response(serializer.data)


@method_decorator(csrf_exempt, name="dispatch")
class MessageAttachmentUploadView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, message_id):
        message = get_object_or_404(Message, pk=message_id)
        ensure_room_member(message.room, request.user)

        uploaded_file = request.FILES.get("file")
        if not uploaded_file:
            return Response({"detail": "File is required."}, status=400)

        attachment = MessageAttachment.objects.create(
            message=message,
            file=uploaded_file,
            original_name=uploaded_file.name,
            comment=request.data.get("comment", ""),
        )

        serializer = MessageAttachmentSerializer(
            attachment, context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils.dateparse import parse_datetime

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied, NotFound

from .models import Room, RoomMembership, Message
from .serializers import (
    RoomSerializer,
    CreateRoomSerializer,
    MessageSerializer,
    CreateMessageSerializer,
    UpdateMessageSerializer)
from core.authentication import CsrfExemptSessionAuthentication


def ensure_room_member(room, user):
    is_member = room.memberships.filter(user=user).exists()
    if not is_member:
        raise PermissionDenied('You are not a member of this room.')


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
            visibility=Room.Visibility.PUBLIC
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
            memberships__user=self.request.user
        ).select_related('owner').prefetch_related('memberships').distinct()


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

        serializer = MessageSerializer(messages, many=True)
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

        output_serializer = MessageSerializer(message)
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

        output_serializer = MessageSerializer(updated_message)
        return Response(output_serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        message = self.get_message(pk)

        if message.user_id != request.user.id:
            raise PermissionDenied('You can delete only your own messages.')

        message.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
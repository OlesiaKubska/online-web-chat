from django.db.models import Q
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator

from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from .models import Room, RoomMembership
from .serializers import RoomSerializer, CreateRoomSerializer
from core.authentication import CsrfExemptSessionAuthentication


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
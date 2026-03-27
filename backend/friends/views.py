from django.core.exceptions import ValidationError as DjangoValidationError
from django.contrib.auth import get_user_model
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.db import models

from .models import FriendRequest, Friendship
from .serializers import FriendRequestCreateSerializer, FriendRequestSerializer, FriendSerializer
from .services import accept_friend_request, reject_friend_request, cancel_friend_request, remove_friendship, ban_user, unban_user
from core.authentication import CsrfExemptSessionAuthentication


User = get_user_model()


@method_decorator(csrf_exempt, name='dispatch')
class FriendRequestCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FriendRequestCreateSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            friend_request = serializer.save()
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output_serializer = FriendRequestSerializer(friend_request)
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class IncomingFriendRequestListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FriendRequestSerializer

    def get_queryset(self):
        return FriendRequest.objects.filter(
            to_user=self.request.user,
            status=FriendRequest.Status.PENDING,
        ).select_related("from_user", "to_user").order_by("-created_at")


class OutgoingFriendRequestListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FriendRequestSerializer

    def get_queryset(self):
        return FriendRequest.objects.filter(
            from_user=self.request.user,
            status=FriendRequest.Status.PENDING,
        ).select_related("from_user", "to_user").order_by("-created_at")


@method_decorator(csrf_exempt, name='dispatch')
class AcceptFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request, pk):
        try:
            friend_request = FriendRequest.objects.select_related(
                "from_user", "to_user"
            ).get(pk=pk)
        except FriendRequest.DoesNotExist:
            return Response(
                {"detail": "Friend request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            friend_request = accept_friend_request(friend_request, request.user)
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FriendRequestSerializer(friend_request)
        return Response(serializer.data, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class RejectFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request, pk):
        try:
            friend_request = FriendRequest.objects.select_related(
                "from_user", "to_user"
            ).get(pk=pk)
        except FriendRequest.DoesNotExist:
            return Response(
                {"detail": "Friend request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            friend_request = reject_friend_request(friend_request, request.user)
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FriendRequestSerializer(friend_request)
        return Response(serializer.data, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class CancelFriendRequestView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]


    def post(self, request, pk):
        try:
            friend_request = FriendRequest.objects.select_related(
                "from_user", "to_user"
            ).get(pk=pk)
        except FriendRequest.DoesNotExist:
            return Response(
                {"detail": "Friend request not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            friend_request = cancel_friend_request(friend_request, request.user)
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = FriendRequestSerializer(friend_request)
        return Response(serializer.data, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class FriendListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = FriendSerializer
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get_queryset(self):
        return get_friends_queryset(self.request.user)


@method_decorator(csrf_exempt, name='dispatch')
class RemoveFriendView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def delete(self, request, user_id):
        if request.user.id == user_id:
            return Response(
                {"detail": "You cannot remove yourself as a friend."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        removed = remove_friendship(request.user, target_user)
        if not removed:
            return Response(
                {"detail": "Users are not friends."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)


        return Response(status=status.HTTP_204_NO_CONTENT)


@method_decorator(csrf_exempt, name='dispatch')
class UserBanView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request, user_id):
        if request.user.id == user_id:
            return Response(
                {"detail": "You cannot ban yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            ban_user(request.user, target_user)
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(status=status.HTTP_201_CREATED)

    def delete(self, request, user_id):
        if request.user.id == user_id:
            return Response(
                {"detail": "You cannot unban yourself."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            unban_user(request.user, target_user)
        except DjangoValidationError as exc:
            return Response(
                {"detail": exc.message},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response(status=status.HTTP_204_NO_CONTENT)

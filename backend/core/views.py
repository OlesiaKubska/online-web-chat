from django.contrib.auth import get_user_model
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .authentication import CsrfExemptSessionAuthentication
from .serializers import (
    PresenceHeartbeatSerializer,
    PresenceResponseSerializer,
    PresenceTabCloseSerializer,
)
from .services import close_presence_tab, get_user_presence, update_presence

User = get_user_model()


class HealthCheckView(APIView):
    def get(self, request):
        return Response({
            "status": "ok",
            "service": "backend",
        })


@method_decorator(csrf_exempt, name="dispatch")
class PresenceHeartbeatView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PresenceHeartbeatSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data

        update_presence(
            user=request.user,
            session_id=data["session_id"],
            tab_id=data["tab_id"],
            status=data["status"],
        )

        effective_status = get_user_presence(request.user)

        response_serializer = PresenceResponseSerializer({
            "user_id": request.user.id,
            "status": effective_status,
        })

        return Response(response_serializer.data)


@method_decorator(csrf_exempt, name="dispatch")
class PresenceUsersView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ids_param = request.query_params.get("ids", "")
        if not ids_param:
            return Response([])

        try:
            user_ids = [int(item.strip()) for item in ids_param.split(",") if item.strip()]
        except ValueError:
            return Response([])

        users = User.objects.filter(id__in=user_ids)
        results = []

        for user in users:
            results.append({
                "user_id": user.id,
                "status": get_user_presence(user),
            })

        return Response(results)


@method_decorator(csrf_exempt, name="dispatch")
class PresenceTabCloseView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = PresenceTabCloseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        data = serializer.validated_data
        close_presence_tab(
            user=request.user,
            session_id=data["session_id"],
            tab_id=data["tab_id"],
        )
        return Response({"ok": True})
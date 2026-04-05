from django.conf import settings
from django.contrib.auth import get_user_model, login, logout, update_session_auth_hash
from django.contrib.sessions.models import Session
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from rest_framework import generics, status
from rest_framework.decorators import api_view
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.authentication import CsrfExemptSessionAuthentication

from .login_serializers import LoginSerializer
from .models import UserSessionMeta
from .serializers import (
    ActiveSessionSerializer,
    ChangePasswordSerializer,
    DeleteAccountSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    RegisterSerializer,
    RevokeSessionSerializer,
)


User = get_user_model()


def _get_client_ip(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()

    remote_addr = request.META.get('REMOTE_ADDR', '')
    return remote_addr or ''


def _sync_session_meta(request):
    session_key = request.session.session_key
    if not session_key:
        return

    user_agent = request.META.get('HTTP_USER_AGENT', '')[:512]
    ip_address = _get_client_ip(request) or None

    defaults = {
        'user': request.user,
        'last_seen': timezone.now(),
    }
    if user_agent:
        defaults['user_agent'] = user_agent
    if ip_address:
        defaults['ip_address'] = ip_address

    session_meta, created = UserSessionMeta.objects.get_or_create(
        session_key=session_key,
        defaults=defaults,
    )

    if created:
        return

    session_meta.user = request.user
    session_meta.last_seen = defaults['last_seen']
    update_fields = ['user', 'last_seen']

    if user_agent:
        session_meta.user_agent = user_agent
        update_fields.append('user_agent')

    if ip_address:
        session_meta.ip_address = ip_address
        update_fields.append('ip_address')

    session_meta.save(update_fields=update_fields)


def _collect_active_sessions(user, current_session_key):
    sessions = Session.objects.filter(expire_date__gt=timezone.now()).order_by('-expire_date')

    active = []
    for session in sessions:
        data = session.get_decoded()
        if str(data.get('_auth_user_id')) != str(user.id):
            continue

        meta = UserSessionMeta.objects.filter(session_key=session.session_key).first()
        active.append({
            'session_key': session.session_key,
            'expires_at': session.expire_date,
            'is_current': session.session_key == current_session_key,
            'ip_address': meta.ip_address if meta and meta.ip_address else '',
            'user_agent': meta.user_agent if meta else '',
        })

    return active


@method_decorator(csrf_exempt, name='dispatch')
class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]


@method_decorator(csrf_exempt, name='dispatch')
class LoginView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data['user']
        login(request, user)
        _sync_session_meta(request)

        return Response({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
            }
        }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        session_key = request.session.session_key
        if session_key:
            UserSessionMeta.objects.filter(session_key=session_key).delete()
        logout(request)
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)


@api_view(['GET'])
def me_view(request):
    if not request.user.is_authenticated:
        return Response(
            {'detail': 'Authentication required.'},
            status=status.HTTP_401_UNAUTHORIZED
        )

    _sync_session_meta(request)
    return Response({
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email,
    }, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        update_session_auth_hash(request, user)
        return Response({'message': 'Password changed successfully'}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token_data = serializer.save()

        response_payload = {
            'message': 'If an account with this email exists, a reset link has been generated.',
        }

        if settings.DEBUG and token_data:
            response_payload['reset'] = token_data

        return Response(response_payload, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({'message': 'Password has been reset successfully.'}, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class ActiveSessionsView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def get(self, request):
        _sync_session_meta(request)
        sessions = _collect_active_sessions(request.user, request.session.session_key)
        serializer = ActiveSessionSerializer(sessions, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


@method_decorator(csrf_exempt, name='dispatch')
class RevokeSessionView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        serializer = RevokeSessionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        session_key = serializer.validated_data['session_key']
        current_session_key = request.session.session_key

        target_session = Session.objects.filter(session_key=session_key).first()
        if not target_session:
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        decoded = target_session.get_decoded()
        if str(decoded.get('_auth_user_id')) != str(request.user.id):
            return Response({'detail': 'Session not found.'}, status=status.HTTP_404_NOT_FOUND)

        target_session.delete()
        UserSessionMeta.objects.filter(session_key=session_key).delete()

        is_current = session_key == current_session_key
        if is_current:
            logout(request)

        return Response(
            {
                'message': 'Session revoked successfully.',
                'revoked_current': is_current,
            },
            status=status.HTTP_200_OK,
        )


@method_decorator(csrf_exempt, name='dispatch')
class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]
    authentication_classes = [CsrfExemptSessionAuthentication]

    def post(self, request):
        session_key = request.session.session_key

        serializer = DeleteAccountSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()

        if session_key:
            UserSessionMeta.objects.filter(session_key=session_key).delete()

        # Invalidate only this browser session immediately.
        logout(request)

        return Response({'message': 'Account deleted successfully.'}, status=status.HTTP_200_OK)

from django.shortcuts import render
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .serializers import PresenceHeartbeatSerializer, PresenceResponseSerializer
from .services import update_presence, get_user_presence

User = get_user_model()

@api_view(['GET'])
def health_check(request):
    return Response({
        "status": "ok",
        "service": "backend"
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def presence_heartbeat(request):
    serializer = PresenceHeartbeatSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    
    data = serializer.validated_data
    update_presence(
        user=request.user,
        session_id=data['session_id'],
        tab_id=data['tab_id'],
        status=data['status']
    )
    
    effective_status = get_user_presence(request.user)
    
    response_serializer = PresenceResponseSerializer(data={
        'user_id': request.user.id,
        'status': effective_status
    })
    response_serializer.is_valid(raise_exception=True)
    
    return Response(response_serializer.validated_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def presence_users(request):
    ids_param = request.query_params.get('ids', '')
    if not ids_param:
        return Response([])
    
    try:
        user_ids = [int(id.strip()) for id in ids_param.split(',') if id.strip()]
    except ValueError:
        return Response([])
    
    users = User.objects.filter(id__in=user_ids)
    results = []
    
    for user in users:
        status = get_user_presence(user)
        results.append({
            'user_id': user.id,
            'status': status
        })
    
    return Response(results)
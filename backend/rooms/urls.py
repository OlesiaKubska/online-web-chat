from django.urls import path
from .views import (
    RoomCreateView,
    PublicRoomListView,
    MyRoomListView,
    RoomDetailView,
    JoinRoomView,
    LeaveRoomView,
    RoomMessageListCreateView,
    MessageDetailView,
)

urlpatterns = [
    path('', PublicRoomListView.as_view(), name='public-rooms'),
    path('create/', RoomCreateView.as_view(), name='create-room'),
    path('my/', MyRoomListView.as_view(), name='my-rooms'),
    path('<int:pk>/', RoomDetailView.as_view(), name='room-detail'),
    path('<int:pk>/join/', JoinRoomView.as_view(), name='join-room'),
    path('<int:pk>/leave/', LeaveRoomView.as_view(), name='leave-room'),
    path('<int:pk>/messages/', RoomMessageListCreateView.as_view(), name='room-messages'),
    path('messages/<int:pk>/', MessageDetailView.as_view(), name='message-detail'),
]
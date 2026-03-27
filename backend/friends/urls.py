from django.urls import path

from .views import (
    FriendRequestCreateView,
    OutgoingFriendRequestListView,
    AcceptFriendRequestView,
    RejectFriendRequestView,
    CancelFriendRequestView,
    FriendListView,
    RemoveFriendView,
    IncomingFriendRequestListView,
)

urlpatterns = [
    path("", FriendListView.as_view(), name="friend-list"),
    path("<int:user_id>/", RemoveFriendView.as_view(), name="friend-remove"),
    path("requests/", FriendRequestCreateView.as_view(), name="friend-request-create"),
    path("requests/incoming/", IncomingFriendRequestListView.as_view(), name="friend-request-incoming"),
    path("requests/outgoing/", OutgoingFriendRequestListView.as_view(), name="friend-request-outgoing"),
    path("requests/<int:pk>/accept/", AcceptFriendRequestView.as_view(), name="friend-request-accept"),
    path("requests/<int:pk>/reject/", RejectFriendRequestView.as_view(), name="friend-request-reject"),
    path("requests/<int:pk>/cancel/", CancelFriendRequestView.as_view(), name="friend-request-cancel"),
]
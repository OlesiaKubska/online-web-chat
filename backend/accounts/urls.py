from django.urls import path

from accounts.views import (
    RegisterView,
    LoginView,
    LogoutView,
    me_view,
    ChangePasswordView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', me_view, name='me'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
]
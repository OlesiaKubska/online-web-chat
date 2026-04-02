from django.urls import path

from accounts.views import (
    RegisterView,
    LoginView,
    LogoutView,
    me_view,
    ChangePasswordView,
    PasswordResetRequestView,
    PasswordResetConfirmView,
    DeleteAccountView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('me/', me_view, name='me'),
    path('change-password/', ChangePasswordView.as_view(), name='change-password'),
    path('password-reset/request/', PasswordResetRequestView.as_view(), name='password-reset-request'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='password-reset-confirm'),
    path('delete-account/', DeleteAccountView.as_view(), name='delete-account'),
]
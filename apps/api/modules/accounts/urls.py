"""URL routes for accounts authentication endpoints."""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from modules.accounts.views.auth import (
    CsrfInitView,
    CurrentUserView,
    LoginView,
    LogoutView,
)

urlpatterns = [
    path("csrf/", CsrfInitView.as_view(), name="auth-csrf"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("refresh/", TokenRefreshView.as_view(), name="auth-token-refresh"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", CurrentUserView.as_view(), name="auth-me"),
]

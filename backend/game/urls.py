from django.urls import path
from .views import register_user, get_players,leave_lobby

urlpatterns = [
    path('register/', register_user),
    path('players/', get_players),
    path('leave/', leave_lobby),  # ✅ add this line
]

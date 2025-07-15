from django.urls import path
from channels.routing import ProtocolTypeRouter, URLRouter
from game.routing import GameConsumer

application = ProtocolTypeRouter({
    'websocket': URLRouter([path('ws/game/<uuid:game_id>/', GameConsumer.as_asgi())])
})

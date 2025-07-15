from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Player
from .serializers import PlayerSerializer
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import random

@api_view(['POST'])
def register_user(request):
    name = request.data.get('name')
    character = request.data.get('character')
    zone = request.data.get('zone')

    if not all([name, character, zone]):
        return Response({'error': 'Missing required fields'}, status=400)

    if Player.objects.filter(name=name).exists():
        return Response({'error': 'Name already taken'}, status=400)

    # Character stats
    character_stats = {
        'Blazer': {'attack': 30, 'hp': 100},
        'Tanker': {'attack': 20, 'hp': 150},
        'Sprinter': {'attack': 25, 'hp': 80},
        'Sniper': {'attack': 40, 'hp': 60},
    }

    if character not in character_stats:
        return Response({'error': 'Invalid character'}, status=400)

    attack = character_stats[character]['attack']
    hp = character_stats[character]['hp']

    # Zone-based spawn location
    zone_bounds = {
        'North': (0, 0, 9, 2),   # (x1, y1, x2, y2)
        'South': (0, 7, 9, 9),
        'East':  (7, 0, 9, 9),
        'West':  (0, 0, 2, 9),
    }

    if zone not in zone_bounds:
        return Response({'error': 'Invalid zone'}, status=400)

    x1, y1, x2, y2 = zone_bounds[zone]
    taken = set((p.x, p.y) for p in Player.objects.all())

    tries = 0
    while True:
        x, y = random.randint(x1, x2), random.randint(y1, y2)
        if (x, y) not in taken or tries > 50:
            break
        tries += 1

    player = Player.objects.create(
        name=name,
        x=x,
        y=y,
        character=character,
        attack=attack,
        hp=hp,
        zone=zone
    )

    # Notify via WebSocket
    layer = get_channel_layer()
    async_to_sync(layer.group_send)(
        "players",
        {
            "type": "new_player",
            "name": name,
            "x": x,
            "y": y,
            "character": character,
            "attack": attack,
            "hp": hp,
            "zone": zone,
        }
    )

    return Response({
        'name': name,
        'x': x,
        'y': y,
        'character': character,
        'attack': attack,
        'hp': hp,
        'zone': zone,
    })


@api_view(['GET'])
def get_players(request):
    players = Player.objects.all()
    return Response(PlayerSerializer(players, many=True).data)


@api_view(['POST'])
def leave_lobby(request):
    name = request.data.get('name')
    if not name:
        return Response({'error': 'No name provided'}, status=400)

    try:
        player = Player.objects.get(name=name)
        x, y = player.x, player.y
        player.delete()

        # Notify others
        layer = get_channel_layer()
        async_to_sync(layer.group_send)(
            "players",
            {
                "type": "remove_player",
                "name": name,
                "x": x,
                "y": y,
            }
        )
        return Response({'message': 'Player removed'})
    except Player.DoesNotExist:
        return Response({'error': 'Player not found'}, status=404)

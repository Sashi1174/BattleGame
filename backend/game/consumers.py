import json
from channels.generic.websocket import AsyncWebsocketConsumer
from urllib.parse import parse_qs

player_states = {}      # name -> {player info}
player_channels = {}    # name -> channel_name
game_state = {"started": False}


def get_initial_position(zone):
    if zone == "North":
        return (10, 0)
    elif zone == "South":
        return (10, 14)
    elif zone == "East":
        return (19, 7)
    elif zone == "West":
        return (0, 7)
    else:
        return (0, 0)


class PlayerConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        query_params = parse_qs(self.scope["query_string"].decode())
        self.name = query_params.get("name", ["Anonymous"])[0]

        # Remove stale player if already exists
        if self.name in player_states:
            del player_states[self.name]

        await self.channel_layer.group_add("players", self.channel_name)
        await self.accept()

        player_channels[self.name] = self.channel_name

        # Placeholder until actual player_info is received
        player_states[self.name] = {
            "name": self.name,
            "x": 0,
            "y": 0,
            "character": "",
            "attack": 0,
            "hp": 0,
            "zone": ""
        }

        # Send back existing players to new player
        for p in player_states.values():
            if p["name"] != self.name:
                await self.send(text_data=json.dumps({
                    "type": "new_player",
                    **p
                }))

        # Notify others of placeholder until full info comes
        await self.channel_layer.group_send("players", {
            "type": "new_player",
            **player_states[self.name],
            "channel_name": self.channel_name
        })

        if game_state["started"]:
            await self.send(text_data=json.dumps({ "type": "game_started" }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard("players", self.channel_name)

        if self.name in player_states:
            del player_states[self.name]
        if self.name in player_channels:
            del player_channels[self.name]

        await self.channel_layer.group_send("players", {
            "type": "remove_player",
            "name": self.name
        })

    async def receive(self, text_data):
        data = json.loads(text_data)

        if data["type"] == "player_info":
            zone = data["zone"]
            x, y = get_initial_position(zone)

            player_states[self.name].update({
                "character": data["character"],
                "attack": data["attack"],
                "hp": data["hp"],
                "zone": zone,
                "x": x,
                "y": y
            })

            await self.channel_layer.group_send("players", {
                "type": "new_player",
                **player_states[self.name],
                "channel_name": self.channel_name
            })

        elif data["type"] == "start_game":
            if not game_state["started"]:
                game_state["started"] = True
                await self.channel_layer.group_send("players", {
                    "type": "game_started"
                })

        elif data["type"] == "move":
            dx = data.get("dx", 0)
            dy = data.get("dy", 0)

            player = player_states.get(self.name)
            if player:
                player["x"] = max(0, min(19, player["x"] + dx))
                player["y"] = max(0, min(14, player["y"] + dy))

                await self.channel_layer.group_send("players", {
                    "type": "player_moved",
                    "name": self.name,
                    "x": player["x"],
                    "y": player["y"]
                })

        elif data["type"] == "attack":
            attacker = player_states.get(self.name)
            if not attacker:
                print(f"[ATTACK] No attacker found for {self.name}")
                return
            
            print(f"[ATTACK] {self.name} at ({attacker['x']},{attacker['y']}) is attacking...")
            for target_name, target in list(player_states.items()):
                if target_name == self.name:
                    continue

                dx = abs(attacker["x"] - target["x"])
                dy = abs(attacker["y"] - target["y"])

                if dx + dy == 1:  # Adjacent
                    target["hp"] -= attacker["attack"]

                    if target["hp"] <= 0:
                        del player_states[target_name]
                        if target_name in player_channels:
                            del player_channels[target_name]
                        await self.channel_layer.group_send("players", {
                            "type": "remove_player",
                            "name": target_name
                        })
                    else:
                        await self.channel_layer.group_send("players", {
                            "type": "player_damaged",
                            "name": target_name,
                            "hp": target["hp"]
                        })

            if len(player_states) == 1:
                winner = list(player_states.keys())[0]
                game_state["started"] = False
                await self.channel_layer.group_send("players", {
                    "type": "game_over",
                    "winner": winner
                })

    # Group Event Handlers
    async def new_player(self, event):
        if event["channel_name"] != self.channel_name:
            await self.send(text_data=json.dumps({
                "type": "new_player",
                "name": event["name"],
                "x": event["x"],
                "y": event["y"],
                "character": event["character"],
                "attack": event["attack"],
                "hp": event["hp"],
                "zone": event["zone"]
            }))

    async def remove_player(self, event):
        await self.send(text_data=json.dumps({
            "type": "remove_player",
            "name": event["name"]
        }))

    async def game_started(self, event):
        await self.send(text_data=json.dumps({ "type": "game_started" }))

    async def player_moved(self, event):
        await self.send(text_data=json.dumps({
            "type": "player_moved",
            "name": event["name"],
            "x": event["x"],
            "y": event["y"]
        }))

    async def player_damaged(self, event):
        await self.send(text_data=json.dumps({
            "type": "player_damaged",
            "name": event["name"],
            "hp": event["hp"]
        }))

    async def game_over(self, event):
        await self.send(text_data=json.dumps({
            "type": "game_over",
            "winner": event["winner"]
        }))

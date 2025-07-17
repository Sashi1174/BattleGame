# BattleGame
🔫 Multiplayer Grid Game
A real-time, full-stack multiplayer grid-based battle game built with Django, Django Channels, and React. Four players can join a lobby, choose unique characters, move around a grid, and attack adjacent players until one remains victorious.

🎮 Features
🔄 Real-Time WebSocket Gameplay (using Django Channels)

👥 4-Player Lobby Support

🧙 Character Classes with distinct HP & Attack stats:

Blazer: High attack, medium health

Tanker: Low attack, high health

Sprinter: Balanced stats, faster

Sniper: High attack, low health

🌐 Zone-Based Spawn Points (North, South, East, West)

🗺️ 20x15 Grid Movement with Arrow Keys

💥 Attack Mechanism for adjacent enemies

🏆 Game Over State with Winner Announcement

🧠 Frontend State Persistence using localStorage

🍞 In-Game Notifications via React-Toastify

⚙️ Tech Stack
Frontend:

React

Axios

WebSockets

Toastify

CSS Grid

Backend:

Django

Django REST Framework (DRF)

Django Channels

Redis (for channel layer, if deployed)


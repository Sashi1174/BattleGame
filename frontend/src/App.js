import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './index.css';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

let socket;

const characters = {
  Blazer: { attack: 30, hp: 100 },
  Tanker: { attack: 20, hp: 150 },
  Sprinter: { attack: 25, hp: 80 },
  Sniper: { attack: 40, hp: 60 },
};

const zones = ['North', 'South', 'East', 'West'];

function App() {
  const [step, setStep] = useState(() => localStorage.getItem('player_joined') ? 3 : 1);
  const [name, setName] = useState(localStorage.getItem('player_name') || '');
  const [character, setCharacter] = useState('');
  const [zone, setZone] = useState('');
  const [joined, setJoined] = useState(!!localStorage.getItem('player_joined'));
  const [players, setPlayers] = useState([]);
  const [gameStarted, setGameStarted] = useState(localStorage.getItem('game_started') === 'true');

  useEffect(() => {
    if (joined) {
      fetchPlayers();
      connectWebSocket();
    }

    return () => {
      if (socket) socket.close();
    };
  }, [joined]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!gameStarted) return;
      let dx = 0, dy = 0;
      if (e.key === "ArrowUp") dy = -1;
      else if (e.key === "ArrowDown") dy = 1;
      else if (e.key === "ArrowLeft") dx = -1;
      else if (e.key === "ArrowRight") dx = 1;
      if (dx !== 0 || dy !== 0) {
        socket.send(JSON.stringify({ type: "move", dx, dy }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameStarted]);

  const fetchPlayers = () => {
    axios.get('http://localhost:8000/api/players/')
      .then(res => setPlayers(res.data))
      .catch(err => console.error('Error fetching players:', err));
  };

  const connectWebSocket = () => {
    const playerName = localStorage.getItem('player_name') || 'Guest';
    socket = new WebSocket(`ws://localhost:8000/ws/players/?name=${encodeURIComponent(playerName)}`);

    socket.onopen = () => {
      console.log("WebSocket connected");
      socket.send(JSON.stringify({
        type: 'player_info',
        character: localStorage.getItem('player_character'),
        zone: localStorage.getItem('player_zone'),
        attack: characters[localStorage.getItem('player_character')]?.attack,
        hp: characters[localStorage.getItem('player_character')]?.hp
      }));
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log("WS message received:", data);

      if (data.type === 'new_player') {
        setPlayers(prev => {
          const exists = prev.some(p => p.name === data.name);
          return exists ? prev : [...prev, data];
        });
      } else if (data.type === 'remove_player') {
        setPlayers(prev => prev.filter(p => p.name !== data.name));
        toast.error(`💀 ${data.name} has been eliminated!`, {
          position: "top-center",
          autoClose: 3000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: false,
          draggable: false,
          theme: "dark",
        });
      } else if (data.type === 'player_moved') {
        setPlayers(prev => prev.map(p => p.name === data.name ? { ...p, x: data.x, y: data.y } : p));
      } else if (data.type === 'player_damaged') {
        setPlayers(prev => prev.map(p => p.name === data.name ? { ...p, hp: data.hp } : p));
      } else if (data.type === 'game_started') {
        setGameStarted(true);
        localStorage.setItem('game_started', 'true');
} else if (data.type === 'game_over') {
  toast.success(`🏆 Game Over! Winner: ${data.winner}`, {
    position: "top-center",
    autoClose: 10000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: false,
    theme: "colored",
    icon: "🎉"
  });
  setGameStarted(false);
  localStorage.removeItem('game_started');
}

    };

    socket.onclose = () => console.log("WebSocket closed");
    socket.onerror = (e) => console.error("WebSocket error", e);
  };

  const handleNameSubmit = () => {
    if (!name.trim()) {
      alert("Please enter your name");
      return;
    }
    localStorage.setItem('player_name', name);
    setStep(2);
  };

  const register = async () => {
    if (!character || !zone) {
      alert("Please select character and zone");
      return;
    }

    if (players.length >= 4) {
      alert("Lobby is full. Max 4 players allowed.");
      return;
    }

    try {
      await axios.post('http://localhost:8000/api/register/', {
        name,
        character,
        zone,
      });

      localStorage.setItem('player_joined', 'true');
      localStorage.setItem("player_character", character);
      localStorage.setItem("player_zone", zone);

      setJoined(true);
      setStep(3);
    } catch (err) {
      alert("Name already taken or server error.");
    }
  };

  const leaveLobby = async () => {
    try {
      await axios.post('http://localhost:8000/api/leave/', { name });
    } catch (err) {
      console.error("Error leaving lobby:", err);
    }

    localStorage.clear();

    setName('');
    setCharacter('');
    setZone('');
    setPlayers([]);
    setStep(1);
    setJoined(false);
    setGameStarted(false);
  };

  const startGame = () => {
    if (!gameStarted && socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "start_game" }));
    }
  };

  const handleAttack = () => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "attack" }));
    }
  };

  const renderGrid = () => {
    const numRows = 15;
    const numCols = 20;
    const currentName = localStorage.getItem('player_name');

    const cells = [];
    for (let y = 0; y < numRows; y++) {
      for (let x = 0; x < numCols; x++) {
        const player = players.find(p => p.x === x && p.y === y);
        cells.push(
          <div key={`${x}-${y}`} className="cell">
            {player && (
              <div className="avatar-point">
                <span className={`dot ${player.name === currentName ? 'current-player' : 'other-player'}`}>●</span>
                <span className="player-name">{player.name}</span>
                <div className="player-hp">❤️ {player.hp}</div>
              </div>
            )}
          </div>
        );
      }
    }

    return cells;
  };

  const currentPlayer = players.find(p => p.name === name);

  return (
    <>
      <ToastContainer />
      <div style={{ display: 'flex' }}>
        {step === 3 && currentPlayer && (
          <div style={{
            width: '220px',
            background: '#1e1e1e',
            color: '#fff',
            padding: '20px',
            borderRight: '2px solid #333',
            height: '100vh'
          }}>
            <h3>Your Stats</h3>
            <p><strong>Character:</strong> {currentPlayer.character}</p>
            <p><strong>⚔️ Attack:</strong> {characters[currentPlayer.character]?.attack || '-'}</p>
            <p><strong>❤️ HP:</strong> {currentPlayer.hp}</p>
          </div>
        )}

        <div style={{ padding: '20px', flex: 1 }}>
          <h1>Multiplayer Lobby Grid</h1>

          {step === 1 && (
            <>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter your name"
              />
              <br /><br />
              <button onClick={handleNameSubmit}>Next</button>
            </>
          )}

          {step === 2 && (
            <>
              <p>Hello, <strong>{name}</strong>! Choose your character and zone:</p>
              <label>Character:</label>
              <select value={character} onChange={e => setCharacter(e.target.value)}>
                <option value="">--Select--</option>
                {Object.keys(characters).map(char => (
                  <option key={char} value={char}>
                    {char} (Attack: {characters[char].attack}, HP: {characters[char].hp})
                  </option>
                ))}
              </select><br /><br />

              <label>Zone:</label>
              <select value={zone} onChange={e => setZone(e.target.value)}>
                <option value="">--Select--</option>
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select><br /><br />

              <button onClick={register}>Join Lobby</button>
            </>
          )}

          {step === 3 && (
            <>
              <p><strong>Welcome, {name}!</strong></p>
              <button onClick={leaveLobby}>Leave Lobby</button>

              {players.length === 4 && !gameStarted && (
                <button onClick={startGame} style={{ marginTop: '10px' }}>
                  Start Game
                </button>
              )}

              {gameStarted && (
                <button onClick={handleAttack} style={{ marginTop: '10px', background: 'crimson', color: 'white' }}>
                  Attack
                </button>
              )}

              <div className="character-info-bar">
                {players.map(player => (
                  <div key={player.name} className="character-card">
                    <p><strong>{player.name}</strong></p>
                    <p>{player.character}</p>
                  </div>
                ))}
              </div>

              <div className="grid">
                {renderGrid()}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export default App;

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../index.css';

const socket = new WebSocket('ws://localhost:8000/ws/players/');

function Lobby() {
  const [players, setPlayers] = useState([]);
  const name = localStorage.getItem('player_name');
  const character = localStorage.getItem('player_character');

  useEffect(() => {
    // Fetch initial list of players
    axios.get('http://localhost:8000/api/players/')
      .then(res => setPlayers(res.data));

    socket.onopen = () => console.log("✅ WebSocket connected");
    socket.onerror = (e) => console.error("❌ WebSocket error", e);
    socket.onclose = () => console.log("❌ WebSocket closed");

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_player') {
        setPlayers(prev => {
          const exists = prev.some(p => p.name === data.name);
          return exists ? prev : [...prev, data];
        });
      } else if (data.type === 'remove_player') {
        setPlayers(prev => prev.filter(p => p.name !== data.name));
      }
    };

    return () => {
      socket.close();
    };
  }, []);

  const leaveLobby = async () => {
    try {
      await axios.post('http://localhost:8000/api/leave/', { name });
    } catch (err) {
      console.error("Error leaving lobby:", err);
    }
    localStorage.clear();
    window.location.href = '/'; // go back to character selection or home
  };

const renderGrid = () => {
  const grid = [];
  for (let y = 0; y < 10; y++) {
    const row = [];
    for (let x = 0; x < 10; x++) {
      const player = players.find(p => p.x === x && p.y === y);
      row.push(
        <div key={`${x}-${y}`} className="cell">
          {player ? player.name : ''}
        </div>
      );
    }
    grid.push(<div className="row" key={y}>{row}</div>);
  }
  return grid;
};

  return (
    <div style={{ padding: '20px' }}>
      <h1>Lobby Grid</h1>
      <p><strong>You are:</strong> {name} ({character})</p>
      <button onClick={leaveLobby}>Leave Lobby</button>

      <div className="grid">
        {renderGrid()}
      </div>
    </div>
  );
}

export default Lobby;

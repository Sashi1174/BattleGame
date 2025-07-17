import React, { useState, useEffect, useContext } from 'react'
import axios from 'axios'
import AuthContext from './AuthContext'

export default function GameBoard({ match }) {
  const { user } = useContext(AuthContext)
  const [game, setGame] = useState(null)
  const [timer, setTimer] = useState(0)

  useEffect(() => {
    const fetch = async () => {
      const res = await axios.get(`/api/games/${match.params.id}/`, {
        headers: { Authorization: `Bearer ${user.token}` }
      })
      setGame(res.data)
      const expires = new Date(res.data.turn_expires).getTime()
      setTimer(Math.max(0, Math.floor((expires - Date.now()) / 1000)))
    }
    fetch()
    const ws = new WebSocket(`ws://${window.location.host}/ws/game/${match.params.id}/`)
    ws.onmessage = e => setGame(JSON.parse(e.data))
    const ti = setInterval(() => setTimer(t => Math.max(0, t - 1)), 1000)
    return () => { ws.close(); clearInterval(ti) }
  }, [match.params.id, user.token])

  const act = (type, payload) => {
    axios.post(`/api/games/${game.id}/${type}/`, payload,
      { headers: { Authorization: `Bearer ${user.token}` } })
      .then(res => setGame(res.data))
  }

  if (!game) return <>Loading…</>
  const me = game.players.find(p => p.user === user.user_id)
  const isMyTurn = game.turn === user.user_id

  return (
    <div>
      <h2>Turn: {isMyTurn ? 'Your' : 'Opponent'} ({timer}s left)</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(10,30px)',
        gap: '2px'
      }}>
        {Array(100).fill(0).map((_, i) => {
          const x = i % 10, y = Math.floor(i / 10)
          const p = game.players.find(pl => pl.x === x && pl.y === y)
          return (
            <div key={i} style={{
              width: 30, height: 30, border: '1px solid #333',
              backgroundColor: p ? '#faa' : '#eee',
              position: 'relative'
            }}>
              {p && (
                <>
                  <span style={{ fontSize: 18 }}>
                    {p.character === 'BLAZER' ? '🔥' :
                     p.character === 'TANKER' ? '🛡️' :
                     p.character === 'SPRINTER' ? '⚡' : '🎯'}
                  </span>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0,
                    fontSize: 10, background: '#000', color: '#fff'
                  }}>{p.hp}</div>
                </>
              )}
            </div>
          )
        })}
      </div>

      {isMyTurn && (
        <div style={{ marginTop: 20 }}>
          <button onClick={() => act('move', { dx: 1, dy: 0 })}>Move →</button>
          <button onClick={() => act('move', { dx: -1, dy: 0 })}>Move ←</button>
          <button onClick={() => act('move', { dx: 0, dy: 1 })}>Move ↓</button>
          <button onClick={() => act('move', { dx: 0, dy: -1 })}>Move ↑</button>
          <button onClick={() => act('attack', {})}>Attack</button>
        </div>
      )}
    </div>
  )
}

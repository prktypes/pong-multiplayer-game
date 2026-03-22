import { useState } from 'react';

export default function Lobby({ onCreateRoom, onJoinRoom, error }) {
  const [code, setCode] = useState('');

  function handleJoin() {
    if (!code.trim()) return;
    onJoinRoom(code.trim().toUpperCase());
  }

  return (
    <div className="lobby">
      <div className="lobby-title">PONG</div>
      <div className="lobby-subtitle">Multiplayer</div>

      <div className="lobby-card">
        <button className="btn-primary" onClick={onCreateRoom}>
          Create Room
        </button>
        <div className="lobby-divider">or</div>
        <div className="join-row">
          <input
            className="code-input"
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="ENTER CODE"
            maxLength={4}
          />
          <button className="btn-secondary" onClick={handleJoin}>
            Join
          </button>
        </div>
        {error && <div className="error-msg">{error}</div>}
      </div>
    </div>
  );
}
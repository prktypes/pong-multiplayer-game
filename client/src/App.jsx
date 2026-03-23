import { useState, useEffect } from 'react';
import socket from './socket';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import './index.css';

export default function App() {
  const [gameState, setGameState]     = useState('idle');
  const [roomCode, setRoomCode]       = useState('');
  const [playerNumber, setPlayerNumber] = useState(null);
  const [roomError, setRoomError]     = useState('');

  // ── Socket events ─────────────────────────────────────────────
  useEffect(() => {

    socket.on('roomCreated', (data) => {
      setRoomCode(data.roomCode);
      setPlayerNumber(data.playerNumber);
      setRoomError('');
      setGameState('waiting');
    });

    socket.on('roomJoined', (data) => {
      setRoomCode(data.roomCode);
      setPlayerNumber(data.playerNumber);
      setRoomError('');
      setGameState('waiting');
    });

    socket.on('roomReady', (data) => {
      console.log('Room ready! Players:', data.players);
      setGameState('ready');
    });

    socket.on('joinError', (data) => {
      setRoomError(data.error);
    });

    socket.on('opponentLeft', (data) => {
      setGameState('waiting');
      setRoomError(data.message);
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('roomReady');
      socket.off('roomError');
      socket.off('opponentLeft');
    };
  }, []);

  // ── Handlers ──────────────────────────────────────────────────
  function handleCreateRoom() {
    setRoomError('');
    socket.emit('createRoom');
  }

  function handleJoinRoom(code) {
    setRoomError('');
    socket.emit('joinRoom', { code });
  }

  function handleLeaveRoom() {
    socket.emit('leaveRoom');
    setGameState('idle');
    setRoomCode('');
    setPlayerNumber(null);
    setRoomError('');
  }

  // ── Screens ───────────────────────────────────────────────────
  if (gameState === 'idle') {
    return <Lobby onCreateRoom={handleCreateRoom} onJoinRoom={handleJoinRoom} error={roomError} />;
  }

  if (gameState === 'waiting') {
    return <WaitingRoom roomCode={roomCode} playerNumber={playerNumber} onLeave={handleLeaveRoom} />;
  }

  if (gameState === 'ready') {
    return (
      <div className="ready-screen">
        <div className="ready-title">⚡ Game Ready!</div>
        <div className="ready-info">Room: <span className="highlight">{roomCode}</span></div>
        <div className="ready-info">You are <span className="highlight">Player {playerNumber}</span></div>
        <div className="ready-sub">Phase 3: Game coming soon...</div>
      </div>
    );
  }
}
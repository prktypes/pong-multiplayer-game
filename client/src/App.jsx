import { useState, useEffect,useRef } from 'react';
import socket from './socket';
import Lobby       from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import Scoreboard  from './components/Scoreboard';
import GameCanvas  from './components/GameCanvas';
import GameOver    from './components/GameOver';
import useGameInput from './hooks/useGameInput';
import './index.css';

export default function App() {
  const [gameState,    setGameState]    = useState('idle');
  const [roomCode,     setRoomCode]     = useState('');
  const [playerNumber, setPlayerNumber] = useState(null);
  const [roomError,    setRoomError]    = useState('');
  const [scores,       setScores]       = useState({ 1: 0, 2: 0 });
  const [winner,       setWinner]       = useState(null);
  const pongStateRef = useRef(null); // Store latest game state for input handling - avoids rerendering of the canvas which overrides the keystrokes

  // Activate keyboard input only while playing
  useGameInput(gameState === 'playing');

  useEffect(() => {
    socket.on('roomCreated', (data) => {
      setRoomCode(data.roomCode);
      setPlayerNumber(data.playerNumber);
      setGameState('waiting');
      setRoomError('');
    });

    socket.on('roomJoined', (data) => {
      setRoomCode(data.roomCode);
      setPlayerNumber(data.playerNumber);
      setGameState('waiting');
      setRoomError('');
    });

    socket.on('roomReady', () => {
      setGameState('ready');
    });

    socket.on('joinError', (data) => {
      setRoomError(data.message);
    });

    socket.on('opponentLeft', (data) => {
      setGameState('waiting');
      setPongState(null);
      setRoomError(data.message);
    });

    // Game events
    socket.on('gameState', (state) => {
      pongStateRef.current = state; // Update ref with latest state for input handling -> no rerender triggered
    });

    socket.on('scored', (data) => {
      setScores(data.scores);
    });

    socket.on('gameOver', (data) => {
      setWinner(data.winner);
      setScores(data.scores);
      setGameState('gameover');
    });

    return () => {
      socket.off('roomCreated');
      socket.off('roomJoined');
      socket.off('roomReady');
      socket.off('joinError');
      socket.off('opponentLeft');
      socket.off('gameState');
      socket.off('scored');
      socket.off('gameOver');
    };
  }, []);

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
    setPongState(null);
    setScores({ 1: 0, 2: 0 });
    setRoomError('');
  }

  function handleStartGame() {
    socket.emit('startGame');
    setGameState('playing');
  }

  function handlePlayAgain() {
    setWinner(null);
    setPongState(null);
    setScores({ 1: 0, 2: 0 });
    socket.emit('startGame');
    setGameState('playing');
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
        <div className="ready-info">
          You are <span className="highlight">Player {playerNumber}</span>
        </div>
        <button className="btn-primary ready-btn" onClick={handleStartGame}>
          Start Game
        </button>
      </div>
    );
  }

  if (gameState === 'playing' || gameState === 'gameover') {
    return (
      <div className="game-screen">
        <Scoreboard scores={scores} playerNumber={playerNumber} roomCode={roomCode} />
        <GameCanvas pongStateRef={pongStateRef} playerNumber={playerNumber} />
        {gameState === 'gameover' && (
          <GameOver
            winner={winner}
            scores={scores}
            playerNumber={playerNumber}
            onPlayAgain={handlePlayAgain}
          />
        )}
      </div>
    );
  }
}
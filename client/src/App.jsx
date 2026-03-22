import { useState, useEffect } from 'react';
import socket from './socket';
import Header from './components/Header';
import MessageFeed from './components/MessageFeed';
import InputRow from './components/InputRow';
import Lobby from './components/Lobby';
import WaitingRoom from './components/WaitingRoom';
import './index.css';

export default function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [myId, setMyId]               = useState('');
  const [messages, setMessages]       = useState([]);
  const [playerCount, setPlayerCount] = useState(0);

  function addSystemMessage(text) {
    setMessages(prev => [...prev, { type: 'system', text }]);
  }

  function handleSend(text) {
    socket.emit('message', { text });
  }

  useEffect(() => {
    socket.on('connect', () => setIsConnected(true));

    socket.on('welcome', (data) => {
      setMyId(data.yourId);
      setPlayerCount(data.totalPlayers);
      addSystemMessage(`You joined! Your ID: ${data.yourId}`);
    });

    socket.on('playerJoined', (data) => {
      setPlayerCount(prev => prev + 1);
      addSystemMessage(`${data.playerId.slice(0, 6)}... joined`);
    });

    socket.on('playerLeft', (data) => {
      setPlayerCount(prev => prev - 1);
      addSystemMessage(`${data.playerId.slice(0, 6)}... left`);
    });

    socket.on('message', (data) => {
      setMessages(prev => [...prev, {
        type: 'chat',
        from: data.from,
        text: data.text,
        time: new Date(data.timestamp).toLocaleTimeString(),
        isMe: data.from === socket.id
      }]);
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      addSystemMessage(`Disconnected: ${reason}`);
    });

    return () => {
      socket.off('connect');
      socket.off('welcome');
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('message');
      socket.off('disconnect');
    };
  }, []);

  return (
    <div className="app">
      <Header isConnected={isConnected} playerCount={playerCount} myId={myId} />
      <MessageFeed messages={messages} />
      <InputRow onSend={handleSend} disabled={!isConnected} />
    </div>
  );
}
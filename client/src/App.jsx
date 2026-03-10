import { useState, useEffect, useRef } from 'react';
import socket from './socket';
import './App.css';

export default function App() {

  // ── State ────────────────────────────────────────────────────
  const [isConnected, setIsConnected]   = useState(false);
  const [myId, setMyId]                 = useState('');
  const [messages, setMessages]         = useState([]);
  const [inputText, setInputText]       = useState('');
  const [playerCount, setPlayerCount]   = useState(0);
  const messagesEndRef                  = useRef(null);

  // ── Auto-scroll to latest message ────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Socket event listeners ────────────────────────────────────
  useEffect(() => {

    // Fires when connection is established
    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected with ID:', socket.id);
    });

    // Server sends this right after connection
    socket.on('welcome', (data) => {
      setMyId(data.yourId);
      setPlayerCount(data.totalPlayers);
      addSystemMessage(`You joined! Your ID: ${data.yourId}`);
    });

    // Someone else connected
    socket.on('playerJoined', (data) => {
      setPlayerCount(prev => prev + 1);
      addSystemMessage(`${data.playerId.slice(0, 6)}... joined`);
    });

    // Someone disconnected
    socket.on('playerLeft', (data) => {
      setPlayerCount(prev => prev - 1);
      addSystemMessage(`${data.playerId.slice(0, 6)}... left`);
    });

    // A chat message from anyone
    socket.on('message', (data) => {
      setMessages(prev => [...prev, {
        type: 'chat',
        from: data.from,
        text: data.text,
        time: new Date(data.timestamp).toLocaleTimeString(),
        isMe: data.from === socket.id
      }]);
    });

    // Fires on disconnect (tab close, network drop, etc.)
    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      addSystemMessage(`Disconnected: ${reason}`);
    });

    // ── Cleanup: remove listeners when component unmounts ──────
    // Without this, listeners stack up if component re-renders
    return () => {
      socket.off('connect');
      socket.off('welcome');
      socket.off('playerJoined');
      socket.off('playerLeft');
      socket.off('message');
      socket.off('disconnect');
    };

  }, []); // empty array = run once on mount

  // ── Helpers ───────────────────────────────────────────────────
  function addSystemMessage(text) {
    setMessages(prev => [...prev, { type: 'system', text }]);
  }

  function sendMessage() {
    if (!inputText.trim()) return;

    // Emit to server — server will broadcast back to everyone
    socket.emit('message', { text: inputText });
    setInputText('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') sendMessage();
  }
}

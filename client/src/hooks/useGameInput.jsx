//this hook will ensure the clean input of the game using keyboard

import { useEffect } from 'react';
import socket from '../socket';

export default function useGameInput(isPlaying) {

  useEffect(() => {
    if (!isPlaying) return;

    // Track which keys are held down
    const keys = new Set();

    // Interval sends paddle direction while key is held
    const inputLoop = setInterval(() => {
      if (keys.has('w') || keys.has('arrowup')) {
        socket.emit('paddleMove', { direction: 'up' });
      }
      if (keys.has('s') || keys.has('arrowdown')) {
        socket.emit('paddleMove', { direction: 'down' });
      }
    }, 16); // same rate as game tick

    function onKeyDown(e) {
      keys.add(e.key.toLowerCase());
    }
    function onKeyUp(e) {
      keys.delete(e.key.toLowerCase());
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup',   onKeyUp);

    return () => {
      clearInterval(inputLoop);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup',   onKeyUp);
    };

  }, [isPlaying]);
}
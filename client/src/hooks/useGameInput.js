import { useEffect } from 'react';
import socket from '../socket';

export default function useGameInput(isPlaying) {
  useEffect(() => {
    console.log('useGameInput mounted, isPlaying:', isPlaying);

    if (!isPlaying) return;

    function onKeyDown(e) {
      console.log('KEY PRESSED:', e.key); // ← do you see this?
      if (e.key === 'w' || e.key === 'ArrowUp') {
        socket.emit('paddleMove', { direction: 'up' });
      }
      if (e.key === 's' || e.key === 'ArrowDown') {
        socket.emit('paddleMove', { direction: 'down' });
      }
    }

    window.addEventListener('keydown', onKeyDown);
    console.log('keydown listener added'); // ← do you see this?

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      console.log('keydown listener removed'); // ← does this fire repeatedly?
    };

  }, [isPlaying]);
}
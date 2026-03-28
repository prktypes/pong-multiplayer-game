import { useEffect, useRef } from 'react';
import C from '../constants';

export default function GameCanvas({ pongStateRef, playerNumber }) {
  const canvasRef = useRef(null);
  const animRef   = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');

    // Self-running draw loop — reads ref directly, no React re-renders needed
    function drawLoop() {
      const state = pongStateRef.current;

      if (!state) {
        drawWaiting(ctx);
      } else {
        drawGame(ctx, state, playerNumber);
      }

      animRef.current = requestAnimationFrame(drawLoop);
    }

    animRef.current = requestAnimationFrame(drawLoop);

    // Cleanup when component unmounts
    return () => cancelAnimationFrame(animRef.current);

  }, [playerNumber]); // only re-run if playerNumber changes

  return (
    <canvas
      ref={canvasRef}
      width={C.CANVAS_WIDTH}
      height={C.CANVAS_HEIGHT}
      className="game-canvas"
    />
  );
}

function drawWaiting(ctx) {
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, C.CANVAS_WIDTH, C.CANVAS_HEIGHT);
  ctx.fillStyle = '#333';
  ctx.font      = '16px "Press Start 2P"';
  ctx.textAlign = 'center';
  ctx.fillText('GET READY...', C.CANVAS_WIDTH / 2, C.CANVAS_HEIGHT / 2);
}

function drawGame(ctx, state, playerNumber) {
  const { ball, paddles } = state;

  // Background
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, C.CANVAS_WIDTH, C.CANVAS_HEIGHT);

  // Center dashed line
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = '#222';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(C.CANVAS_WIDTH / 2, 0);
  ctx.lineTo(C.CANVAS_WIDTH / 2, C.CANVAS_HEIGHT);
  ctx.stroke();
  ctx.setLineDash([]);

  // Player 1 paddle (left)
  ctx.fillStyle = playerNumber === 1 ? '#ffffff' : '#aaaaaa';
  ctx.fillRect(C.PADDLE_OFFSET, paddles[1].y, C.PADDLE_WIDTH, C.PADDLE_HEIGHT);

  // Player 2 paddle (right)
  ctx.fillStyle = playerNumber === 2 ? '#ffffff' : '#aaaaaa';
  ctx.fillRect(
    C.CANVAS_WIDTH - C.PADDLE_OFFSET - C.PADDLE_WIDTH,
    paddles[2].y,
    C.PADDLE_WIDTH,
    C.PADDLE_HEIGHT
  );

  // Ball
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ball.x, ball.y, C.BALL_SIZE, C.BALL_SIZE);
}
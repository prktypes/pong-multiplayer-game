import { useEffect, useRef } from 'react';
import C from '../constants';
const {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_OFFSET,
  BALL_SIZE
} = C;

export default function GameCanvas({ gameState, playerNumber }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!gameState) {
      drawWaiting(ctx);
      return;
    }

    drawGame(ctx, gameState, playerNumber);

  }, [gameState, playerNumber]);

  return (
    <canvas
      ref={canvasRef}
      width={C.CANVAS_WIDTH}
      height={C.CANVAS_HEIGHT}
      className="game-canvas"
    />
  );
}

// ── Draw the waiting state (before game starts) ──────────────
function drawWaiting(ctx) {
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle   = '#333';
  ctx.font        = '16px "Press Start 2P"';
  ctx.textAlign   = 'center';
  ctx.fillText('GET READY...', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
}

// ── Draw the full game frame ─────────────────────────────────
function drawGame(ctx, gameState, playerNumber) {
  const { ball, paddles } = gameState;

  // Background
  ctx.fillStyle = '#0d0d0d';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Center dashed line
  ctx.setLineDash([10, 10]);
  ctx.strokeStyle = '#222';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2, 0);
  ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
  ctx.stroke();
  ctx.setLineDash([]); // reset dash

  // Player 1 paddle (left)
  ctx.fillStyle = playerNumber === 1 ? '#ffffff' : '#aaaaaa';
  ctx.fillRect(
    PADDLE_OFFSET,
    paddles[1].y,
    PADDLE_WIDTH,
    PADDLE_HEIGHT
  );

  // Player 2 paddle (right)
  ctx.fillStyle = playerNumber === 2 ? '#ffffff' : '#aaaaaa';
  ctx.fillRect(
    CANVAS_WIDTH - PADDLE_OFFSET - PADDLE_WIDTH,
    paddles[2].y,
    PADDLE_WIDTH,
    PADDLE_HEIGHT
  );

  // Ball
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(ball.x, ball.y, BALL_SIZE, BALL_SIZE);
}
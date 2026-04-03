const C = require('./constants');

// Creates a fresh game state for a room
function createGameState() {
  return {
    ball: {
      x:  C.CANVAS_WIDTH  / 2,
      y:  C.CANVAS_HEIGHT / 2,
      vx: C.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
      vy: C.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    },
    paddles: {
      1: { y: C.CANVAS_HEIGHT / 2 - C.PADDLE_HEIGHT / 2 },
      2: { y: C.CANVAS_HEIGHT / 2 - C.PADDLE_HEIGHT / 2 },
    },
    scores: { 1: 0, 2: 0 },
    status: 'playing',   // 'playing' | 'finished'
    winner: null,
  };
}

// Resets ball to center after a point is scored
function resetBall() {
  return {
    x:  C.CANVAS_WIDTH  / 2,
    y:  C.CANVAS_HEIGHT / 2,
    vx: C.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
    vy: C.BALL_SPEED * (Math.random() > 0.5 ? 1 : -1),
  };
}

// Called every tick — moves ball and checks everything
// Returns { gameState, scored: null | 1 | 2 }
function tick(gameState) {
  const { ball, paddles, scores } = gameState;

  // ── Move ball ──────────────────────────────────────────────
  ball.x += ball.vx;
  ball.y += ball.vy;

  // ── Top / bottom wall bounce ───────────────────────────────
  if (ball.y <= 0) {
    ball.y  = 0;
    ball.vy = Math.abs(ball.vy);   // force downward
  }
  if (ball.y + C.BALL_SIZE >= C.CANVAS_HEIGHT) {
    ball.y  = C.CANVAS_HEIGHT - C.BALL_SIZE;
    ball.vy = -Math.abs(ball.vy);  // force upward
  }

  // ── Paddle collision ───────────────────────────────────────
  // Player 1 paddle (left side)
  const p1x = C.PADDLE_OFFSET;
  const p1y = paddles[1].y;

  if (
    ball.x <= p1x + C.PADDLE_WIDTH &&
    ball.x >= p1x &&
    ball.y + C.BALL_SIZE >= p1y &&
    ball.y <= p1y + C.PADDLE_HEIGHT
  ) {
    ball.x  = p1x + C.PADDLE_WIDTH;    // push ball out of paddle
    ball.vx = Math.abs(ball.vx) * 1.05; // bounce right, slight speedup
    ball.vx = Math.min(ball.vx, C.BALL_MAX_SPEED);
    // Angle based on where ball hits paddle — top/bottom = steeper angle
    const hitPos = (ball.y - p1y) / C.PADDLE_HEIGHT;  // 0 to 1
    ball.vy = (hitPos - 0.5) * 2 * C.BALL_MAX_SPEED;
  }

  // Player 2 paddle (right side)
  const p2x = C.CANVAS_WIDTH - C.PADDLE_OFFSET - C.PADDLE_WIDTH;
  const p2y = paddles[2].y;

  if (
    ball.x + C.BALL_SIZE >= p2x &&
    ball.x + C.BALL_SIZE <= p2x + C.PADDLE_WIDTH + ball.vx &&
    ball.y + C.BALL_SIZE >= p2y &&
    ball.y <= p2y + C.PADDLE_HEIGHT
  ) {
    ball.x  = p2x - C.BALL_SIZE;       // push ball out of paddle
    ball.vx = -Math.abs(ball.vx) * 1.05; // bounce left, slight speedup
    ball.vx = Math.max(ball.vx, -C.BALL_MAX_SPEED);
    const hitPos = (ball.y - p2y) / C.PADDLE_HEIGHT;
    ball.vy = (hitPos - 0.5) * 2 * C.BALL_MAX_SPEED;
  }

  // ── Scoring ────────────────────────────────────────────────
  let scored = null;

  if (ball.x < 0) {
    // Ball passed left wall — Player 2 scores
    scores[2]++;
    scored = 2;
    gameState.ball = resetBall();
  }

  if (ball.x > C.CANVAS_WIDTH) {
    // Ball passed right wall — Player 1 scores
    scores[1]++;
    scored = 1;
    gameState.ball = resetBall();
  }

  // ── Win condition ──────────────────────────────────────────
  if (scores[1] >= C.WINNING_SCORE || scores[2] >= C.WINNING_SCORE) {
    gameState.status = 'finished';
    gameState.winner = scores[1] >= C.WINNING_SCORE ? 1 : 2;
  }

  return { gameState, scored };
}

// Move a paddle up or down, clamped to canvas bounds
function movePaddle(gameState, playerNumber, direction) {
  const paddle = gameState.paddles[Number(playerNumber)];
  if (!paddle) return;

  if (direction === 'up') {
    paddle.y = Math.max(0, paddle.y - C.PADDLE_SPEED);
  }
  if (direction === 'down') {
    paddle.y = Math.min(
      C.CANVAS_HEIGHT - C.PADDLE_HEIGHT,
      paddle.y + C.PADDLE_SPEED
    );
  }
}

module.exports = { createGameState, tick, movePaddle };
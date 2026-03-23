module.exports = {
  CANVAS_WIDTH:   800,
  CANVAS_HEIGHT:  500,

  PADDLE_WIDTH:   12,
  PADDLE_HEIGHT:  80,
  PADDLE_SPEED:   6,
  PADDLE_OFFSET:  20,   // distance from wall

  BALL_SIZE:      10,
  BALL_SPEED:     5,    // initial speed
  BALL_MAX_SPEED: 12,   // caps so it never gets unplayable

  WINNING_SCORE:  5,
  TICK_RATE:      1000 / 60,   // 60 fps in milliseconds (~16ms)
};
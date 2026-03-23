export default function Scoreboard({ scores, playerNumber, roomCode }) {
  return (
    <div className="scoreboard">
      <div className={`score-side ${playerNumber === 1 ? 'me' : ''}`}>
        <div className="score-label">P1</div>
        <div className="score-number">{scores[1] ?? 0}</div>
      </div>
      <div className="score-center">
        <div className="score-room">{roomCode}</div>
      </div>
      <div className={`score-side ${playerNumber === 2 ? 'me' : ''}`}>
        <div className="score-label">P2</div>
        <div className="score-number">{scores[2] ?? 0}</div>
      </div>
    </div>
  );
}
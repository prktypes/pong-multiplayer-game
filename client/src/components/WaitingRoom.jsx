export default function WaitingRoom({ roomCode, playerNumber, onLeave }) {
  return (
    <div className="waiting">
      <div className="waiting-title">Waiting for opponent...</div>

      <div className="room-code-box">
        <div className="room-code-label">Share this code</div>
        <div className="room-code">{roomCode}</div>
      </div>

      <div className="waiting-info">
        You are <span className="highlight">Player {playerNumber}</span>
      </div>

      <div className="waiting-dots">
        <span /><span /><span />
      </div>

      <button className="btn-ghost" onClick={onLeave}>
        Leave Room
      </button>
    </div>
  );
}
export default function Header({ isConnected, playerCount, myId }) {
  return (
    <div className="header">
      <h1>Pong</h1>
      <div className="status-row">
        <span className={`dot ${isConnected ? 'connected' : 'disconnected'}`} />
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        <span className="pill">{playerCount} online</span>
      </div>
      {myId && <div className="my-id">Your ID: {myId.slice(0, 8)}...</div>}
    </div>
  );
}
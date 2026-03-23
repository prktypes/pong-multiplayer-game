export default function GameOver({ winner, scores, playerNumber, onPlayAgain }) {
  const iWon = winner === playerNumber;

  return (
    <div className="gameover">
      <div className={`gameover-title ${iWon ? 'win' : 'lose'}`}>
        {iWon ? 'You Win!' : 'You Lose'}
      </div>
      <div className="gameover-scores">
        {scores[1]} — {scores[2]}
      </div>
      <button className="btn-primary" onClick={onPlayAgain}>
        Play Again
      </button>
    </div>
  );
}
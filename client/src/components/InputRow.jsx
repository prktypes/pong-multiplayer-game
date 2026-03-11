import { useState } from 'react';

export default function InputRow({ onSend, disabled }) {
  const [text, setText] = useState('');

  function handleSend() {
    if (!text.trim()) return;
    onSend(text);
    setText('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSend();
  }

  return (
    <div className="input-row">
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message and press Enter..."
        disabled={disabled}
      />
      <button onClick={handleSend} disabled={disabled}>Send</button>
    </div>
  );
}
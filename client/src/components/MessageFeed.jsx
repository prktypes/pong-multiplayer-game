import { useEffect, useRef } from 'react';

export default function MessageFeed({ messages }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="feed">
      {messages.map((msg, i) =>
        msg.type === 'system'
          ? <div key={i} className="system-msg">{msg.text}</div>
          : <div key={i} className={`chat-msg ${msg.isMe ? 'mine' : 'theirs'}`}>
              <div className="msg-meta">
                {msg.isMe ? 'You' : msg.from.slice(0, 6) + '...'} · {msg.time}
              </div>
              <div className="msg-bubble">{msg.text}</div>
            </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
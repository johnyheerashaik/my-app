import React from 'react';
import './ChatInput.css';

const ChatInput: React.FC<{ input: string; setInput: (value: string) => void; send: () => void; isStreaming: boolean }> = ({ input, setInput, send, isStreaming }) => {
  return (
    <footer className="composer">
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        disabled={isStreaming}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            send();
          }
        }}
      />
      <button onClick={send} disabled={isStreaming || !input.trim()}>
        Send
      </button>
    </footer>
  );
};

export default ChatInput;
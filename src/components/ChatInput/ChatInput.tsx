import React, { useRef, useState } from 'react';
import { MAX_MESSAGE_LENGTH } from '../../types';
import './ChatInput.css';

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  send: () => void;
  isStreaming: boolean;
  onStop: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  input,
  setInput,
  send,
  isStreaming,
  onStop,
}) => {
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files].slice(0, 5)); // Max 5 files

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;

    // TODO: Handle file attachments
    if (attachments.length > 0) {
      console.log('Sending with attachments:', attachments);
      // You'll need to modify the send function to handle files
    }

    send();
    setAttachments([]);

    // Reset textarea height after sending
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send with Ctrl/Cmd + Enter
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
      return;
    }

    // Just Enter sends (unless Shift is pressed for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
      return;
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;

    // Limit to max length
    if (value.length <= MAX_MESSAGE_LENGTH) {
      setInput(value);

      // Auto-resize textarea
      e.target.style.height = '46px'; // Reset to min-height first
      e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
    }
  };

  const charactersLeft = MAX_MESSAGE_LENGTH - input.length;
  const isNearLimit = charactersLeft < 500;

  return (
    <footer className="composer">
      {/* File attachments preview */}
      {attachments.length > 0 && (
        <div className="attachments-preview">
          {attachments.map((file, index) => (
            <div key={index} className="attachment-item">
              <span className="attachment-name">
                📎 {file.name}
              </span>
              <button
                type="button"
                className="remove-attachment"
                onClick={() => removeAttachment(index)}
                aria-label="Remove file"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="composer-main">
        {/* File upload button */}
        <button
          type="button"
          className="composer-btn file-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={isStreaming}
          title="Attach files"
        >
          📎
        </button>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".txt,.md,.json,.js,.ts,.tsx,.jsx,.css,.html,.py,.java,.c,.cpp"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          className="composer-input"
          value={input}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? "Bot is typing..." : "Type a message... (Enter to send, Shift+Enter for new line)"}
          disabled={isStreaming}
          rows={1}
        />

        {/* Character counter (shown when near limit) */}
        {isNearLimit && (
          <div className={`char-counter ${charactersLeft < 100 ? 'warning' : ''}`}>
            {charactersLeft}
          </div>
        )}

        {/* Stop or Send button */}
        {isStreaming ? (
          <button
            type="button"
            className="composer-btn stop-btn"
            onClick={onStop}
            title="Stop generation (Esc)"
          >
            ⬛ Stop
          </button>
        ) : (
          <button
            type="button"
            className="composer-btn send-btn"
            onClick={handleSend}
            disabled={!input.trim()}
            title="Send message (Ctrl+Enter)"
          >
            ➤ Send
          </button>
        )}
      </div>

      {/* Hints */}
      <div className="composer-hints">
        <span className="hint">
          <kbd>Enter</kbd> to send • <kbd>Shift+Enter</kbd> for new line • <kbd>Ctrl+Enter</kbd> alternative send
        </span>
      </div>
    </footer>
  );
};

export default ChatInput;

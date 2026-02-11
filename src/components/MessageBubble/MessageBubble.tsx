import { useState } from "react";
import type { Message, CodeBlock } from "../../types";
import { CodeBlockComponent } from "../CodeBlock/CodeBlock";
import { formatTimestamp } from "../../types";
import './MessageBubble.css';

type MessageBubbleProps = {
    message: Message;
    onRetry: (messageId: string) => void;
    onEdit: (messageId: string, newContent: string) => void;
    onDelete: (messageId: string) => void;
    onReact: (messageId: string, reaction: '👍' | '👎' | null) => void;
    showActions?: boolean;
};

function parseCodeBlocks(text: string): (string | CodeBlock)[] {
    const result: (string | CodeBlock)[] = [];
    const regex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            result.push(text.slice(lastIndex, match.index));
        }
        result.push({
            language: match[1] || "text",
            code: match[2],
        });
        lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
        result.push(text.slice(lastIndex));
    }

    return result.length > 0 ? result : [text];
}

function MessageContent({ content }: { content: string }) {
    const parts = parseCodeBlocks(content);

    return (
        <div className="content">
            {parts.map((part, idx) =>
                typeof part === "string" ? (
                    <span key={idx} style={{ whiteSpace: "pre-wrap" }}>
                        {part}
                    </span>
                ) : (
                    <CodeBlockComponent key={idx} block={part} />
                )
            )}
        </div>
    );
}

export function MessageBubble({
    message,
    onRetry,
    onEdit,
    onDelete,
    onReact,
    showActions = true,
}: MessageBubbleProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const [copied, setCopied] = useState(false);

    const isEmptyBotMessage = message.role === "assistant" && !message.content;
    const hasError = message.error !== undefined;
    const isRetryable = message.retryable === true;

    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleEdit = () => {
        if (message.role === 'user') {
            setIsEditing(true);
            setEditContent(message.content);
        }
    };

    const handleSaveEdit = () => {
        if (editContent.trim() && editContent !== message.content) {
            onEdit(message.id, editContent.trim());
        }
        setIsEditing(false);
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditContent(message.content);
    };

    const handleReaction = (reaction: '👍' | '👎') => {
        // Toggle reaction if clicking the same one
        const newReaction = message.reaction === reaction ? null : reaction;
        onReact(message.id, newReaction);
    };

    return (
        <div className={`row ${message.role}`}>
            <div className="bubble-container">
                <div className={`bubble ${hasError ? 'error' : ''}`}>
                    {/* Header with role and timestamp */}
                    <div className="bubble-header">
                        <div className="role">
                            {message.role === "user" ? "👤 You" : "🤖 Bot"}
                        </div>
                        {message.timestamp && (
                            <div className="timestamp">
                                {formatTimestamp(message.timestamp)}
                            </div>
                        )}
                    </div>

                    {/* Message content or typing indicator */}
                    {isEmptyBotMessage ? (
                        <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    ) : isEditing ? (
                        <div className="edit-mode">
                            <textarea
                                className="edit-textarea"
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                        handleSaveEdit();
                                    }
                                    if (e.key === 'Escape') {
                                        handleCancelEdit();
                                    }
                                }}
                            />
                            <div className="edit-actions">
                                <button onClick={handleSaveEdit} className="edit-btn save">
                                    ✓ Save
                                </button>
                                <button onClick={handleCancelEdit} className="edit-btn cancel">
                                    ✕ Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <MessageContent content={message.content} />
                    )}

                    {/* Attachments (if any) */}
                    {message.attachments && message.attachments.length > 0 && (
                        <div className="attachments">
                            {message.attachments.map((filename, idx) => (
                                <div key={idx} className="attachment-badge">
                                    📎 {filename}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action buttons */}
                {showActions && !isEmptyBotMessage && !isEditing && (
                    <div className="bubble-actions">
                        {/* Copy button */}
                        <button
                            className="action-btn"
                            onClick={handleCopy}
                            title="Copy message"
                        >
                            {copied ? '✓' : '📋'}
                        </button>

                        {/* Reactions for assistant messages */}
                        {message.role === 'assistant' && (
                            <>
                                <button
                                    className={`action-btn reaction ${message.reaction === '👍' ? 'active' : ''}`}
                                    onClick={() => handleReaction('👍')}
                                    title="Good response"
                                >
                                    👍
                                </button>
                                <button
                                    className={`action-btn reaction ${message.reaction === '👎' ? 'active' : ''}`}
                                    onClick={() => handleReaction('👎')}
                                    title="Bad response"
                                >
                                    👎
                                </button>
                            </>
                        )}

                        {/* Edit button for user messages */}
                        {message.role === 'user' && (
                            <button
                                className="action-btn"
                                onClick={handleEdit}
                                title="Edit message"
                            >
                                ✏️
                            </button>
                        )}

                        {/* Retry button for failed messages */}
                        {hasError && isRetryable && message.role === 'user' && (
                            <button
                                className="action-btn retry"
                                onClick={() => onRetry(message.id)}
                                title="Retry message"
                            >
                                🔄
                            </button>
                        )}

                        {/* Delete button */}
                        <button
                            className="action-btn delete"
                            onClick={() => {
                                if (window.confirm('Delete this message?')) {
                                    onDelete(message.id);
                                }
                            }}
                            title="Delete message"
                        >
                            🗑️
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

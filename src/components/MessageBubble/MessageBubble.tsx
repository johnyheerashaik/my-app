import type { Message, CodeBlock } from "../../types";
import { CodeBlockComponent } from "../CodeBlock/CodeBlock";
import './MessageBubble.css';

type MessageBubbleProps = {
    message: Message;
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

export function MessageBubble({ message }: MessageBubbleProps) {
    const isEmptyBotMessage = message.role === "assistant" && !message.content;

    return (
        <div className={`row ${message.role}`}>
            <div className="bubble">
                <div className="role">{message.role === "user" ? "You" : "Bot"}</div>
                {isEmptyBotMessage ? (
                    <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                    </div>
                ) : (
                    <MessageContent content={message.content} />
                )}
            </div>
        </div>
    );
}

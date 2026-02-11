import { useEffect, useRef } from "react";
import type { Message } from "../../types";
import { MessageBubble } from "../MessageBubble/MessageBubble";
import './ChatContainer.css';

type ChatContainerProps = {
    messages: Message[];
    onRetry: (messageId: string) => void;
    onEdit: (messageId: string, newContent: string) => void;
    onDelete: (messageId: string) => void;
    onReact: (messageId: string, reaction: '👍' | '👎' | null) => void;
    isStreaming: boolean;
};

export function ChatContainer({
    messages,
    onRetry,
    onEdit,
    onDelete,
    onReact,
    isStreaming,
}: ChatContainerProps) {
    const bottomRef = useRef<HTMLDivElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const prevScrollHeight = useRef<number>(0);

    // Auto-scroll with improved behavior
    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;
        const { scrollHeight, scrollTop, clientHeight } = container;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

        // Only auto-scroll if user is near bottom or if streaming
        if (isNearBottom || isStreaming) {
            requestAnimationFrame(() => {
                bottomRef.current?.scrollIntoView({ behavior: "smooth" });
            });
        }

        prevScrollHeight.current = scrollHeight;
    }, [messages, isStreaming]);

    return (
        <main className="chat" ref={containerRef}>
            <div className="chat-messages">
                {messages.map((message, index) => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        onRetry={onRetry}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onReact={onReact}
                        showActions={!isStreaming || index < messages.length - 1}
                    />
                ))}
                <div ref={bottomRef} />
            </div>
        </main>
    );
}

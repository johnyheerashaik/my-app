import { useEffect, useRef } from "react";
import type { Message } from "../../types";
import { MessageBubble } from "../MessageBubble/MessageBubble";
import './ChatContainer.css';

type ChatContainerProps = {
    messages: Message[];
};

export function ChatContainer({ messages }: ChatContainerProps) {
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        requestAnimationFrame(() => {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        });
    }, [messages]);

    return (
        <main className="chat">
            {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
            ))}
            <div ref={bottomRef} />
        </main>
    );
}

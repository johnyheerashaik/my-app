import "./App.css";
import { useChat } from "./hooks/useChat";
import { Header, ChatContainer, ChatInput } from "./components";

export default function App() {
  const { messages, input, setInput, isStreaming, currentStatus, send } = useChat();

  return (
    <div className="page">
      <Header isStreaming={isStreaming} status={currentStatus} />
      <ChatContainer messages={messages} />
      <ChatInput
        input={input}
        setInput={setInput}
        send={send}
        isStreaming={isStreaming}
      />
    </div>
  );
}


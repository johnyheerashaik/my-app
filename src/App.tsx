import "./App.css";
import { useChat } from "./hooks/useChat";
import { Header, ChatContainer, ChatInput } from "./components";
import { SessionSidebar } from "./components/SessionSidebar/SessionSidebar";
import { ShortcutsModal } from "./components/ShortcutsModal/ShortcutsModal";
import { useState } from "react";

export default function App() {
  const chatHook = useChat();
  const {
    messages,
    input,
    setInput,
    isStreaming,
    currentStatus,
    send,
    stopGeneration,
    retryMessage,
    editMessage,
    deleteMessage,
    reactToMessage,
    sessions,
    currentSessionId,
    createNewSession,
    switchSession,
    deleteSession,
    renameSession,
    exportChat,
    usage,
    streamedTokens,
    backendStatus,
    clearChat,
  } = chatHook;

  const [showSidebar, setShowSidebar] = useState(true);
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <div className="app-container">
      {/* Session Sidebar */}
      {showSidebar && (
        <SessionSidebar
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSessionClick={switchSession}
          onNewSession={createNewSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          onClose={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className="page">
        <Header
          isStreaming={isStreaming}
          status={currentStatus}
          backendStatus={backendStatus}
          usage={usage}
          streamedTokens={streamedTokens}
          onToggleSidebar={() => setShowSidebar(!showSidebar)}
          onExport={() => exportChat('md')}
          onClearChat={clearChat}
          onShowShortcuts={() => setShowShortcuts(true)}
          showSidebar={showSidebar}
        />

        <ChatContainer
          messages={messages}
          onRetry={retryMessage}
          onEdit={editMessage}
          onDelete={deleteMessage}
          onReact={reactToMessage}
          isStreaming={isStreaming}
        />

        <ChatInput
          input={input}
          setInput={setInput}
          send={send}
          isStreaming={isStreaming}
          onStop={stopGeneration}
        />
      </div>

      {/* Shortcuts Modal */}
      {showShortcuts && (
        <ShortcutsModal onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}

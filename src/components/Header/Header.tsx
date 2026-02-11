import { useState } from 'react';
import './Header.css';
import { formatTokenCount, formatCost, type Usage } from '../../types';

type HeaderProps = {
    isStreaming: boolean;
    status: string;
    backendStatus: 'online' | 'offline' | 'checking';
    usage: Usage;
    streamedTokens: number;
    onToggleSidebar: () => void;
    onExport: () => void;
    onClearChat: () => void;
    onShowShortcuts: () => void;
    showSidebar: boolean;
};

export function Header({
    isStreaming,
    status,
    backendStatus,
    usage,
    streamedTokens,
    onToggleSidebar,
    onExport,
    onClearChat,
    onShowShortcuts,
    showSidebar,
}: HeaderProps) {
    const [showMenu, setShowMenu] = useState(false);
    const [showUsageStats, setShowUsageStats] = useState(false);

    const totalTokens = usage.promptTokens + usage.completionTokens;

    return (
        <>
            {isStreaming && <div className="progress-bar"></div>}
            <header className="topbar">
                <div className="topbar-left">
                    {/* Sidebar toggle */}
                    <button
                        className="header-btn sidebar-toggle"
                        onClick={onToggleSidebar}
                        title={showSidebar ? "Hide sidebar" : "Show sidebar"}
                    >
                        {showSidebar ? '◀' : '☰'}
                    </button>

                    {/* Brand */}
                    <div className="brand">
                        <span className="brand-name">🤖 My WebBot</span>

                        {/* Backend status indicator */}
                        <div className={`backend-status ${backendStatus}`} title={`Backend: ${backendStatus}`}>
                            <span className="status-dot"></span>
                        </div>
                    </div>
                </div>

                <div className="topbar-center">
                    {/* Status indicator */}
                    <div className={`status ${isStreaming ? "active" : ""}`}>
                        {isStreaming && (
                            <span className="status-icon">
                                <span className="pulse-dot"></span>
                            </span>
                        )}
                        <span className="status-text">{status}</span>
                        {isStreaming && (
                            <span className="token-counter">
                                {formatTokenCount(streamedTokens)} tokens
                            </span>
                        )}
                    </div>
                </div>

                <div className="topbar-right">
                    {/* Usage stats button */}
                    <button
                        className="header-btn usage-btn"
                        onClick={() => setShowUsageStats(!showUsageStats)}
                        title="Usage statistics"
                    >
                        💰 {formatCost(usage.totalCost)}
                    </button>

                    {/* Menu button */}
                    <button
                        className="header-btn menu-btn"
                        onClick={() => setShowMenu(!showMenu)}
                        title="Menu"
                    >
                        ⋮
                    </button>

                    {/* Dropdown menu */}
                    {showMenu && (
                        <div className="header-dropdown">
                            <button onClick={() => { onShowShortcuts(); setShowMenu(false); }}>
                                ⌨️ Keyboard Shortcuts
                            </button>
                            <button onClick={() => { onExport(); setShowMenu(false); }}>
                                📥 Export Chat
                            </button>
                            <button onClick={() => {
                                if (window.confirm('Clear all messages in this chat?')) {
                                    onClearChat();
                                    setShowMenu(false);
                                }
                            }}>
                                🗑️ Clear Chat
                            </button>
                            <div className="menu-divider"></div>
                            <button onClick={() => setShowMenu(false)}>
                                ✕ Close
                            </button>
                        </div>
                    )}

                    {/* Usage stats popup */}
                    {showUsageStats && (
                        <div className="usage-stats-popup">
                            <div className="usage-header">
                                <h3>Usage Statistics</h3>
                                <button
                                    className="close-btn"
                                    onClick={() => setShowUsageStats(false)}
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="usage-content">
                                <div className="usage-row">
                                    <span>Prompt Tokens:</span>
                                    <strong>{formatTokenCount(usage.promptTokens)}</strong>
                                </div>
                                <div className="usage-row">
                                    <span>Completion Tokens:</span>
                                    <strong>{formatTokenCount(usage.completionTokens)}</strong>
                                </div>
                                <div className="usage-row total">
                                    <span>Total Tokens:</span>
                                    <strong>{formatTokenCount(totalTokens)}</strong>
                                </div>
                                <div className="usage-row cost">
                                    <span>Total Cost:</span>
                                    <strong>{formatCost(usage.totalCost)}</strong>
                                </div>
                            </div>
                            <div className="usage-footer">
                                <small>Session statistics • Resets on refresh</small>
                            </div>
                        </div>
                    )}
                </div>
            </header>
        </>
    );
}

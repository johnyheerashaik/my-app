import { useState, useEffect, useRef } from 'react';
import type { Session } from '../../types';
import { formatTimestamp } from '../../types';
import './SessionSidebar.css';

interface SessionSidebarProps {
    sessions: Session[];
    currentSessionId: string | null;
    onSessionClick: (sessionId: string) => void;
    onNewSession: () => void;
    onDeleteSession: (sessionId: string) => void;
    onRenameSession: (sessionId: string, newTitle: string) => void;
    onClose: () => void;
}

export function SessionSidebar({
    sessions,
    currentSessionId,
    onSessionClick,
    onNewSession,
    onDeleteSession,
    onRenameSession,
    onClose,
}: SessionSidebarProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement | null>(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuOpenId && menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setMenuOpenId(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpenId]);

    const handleStartEdit = (session: Session) => {
        setEditingId(session.id);
        setEditTitle(session.title);
        setMenuOpenId(null);
    };

    const handleSaveEdit = (sessionId: string) => {
        if (editTitle.trim()) {
            onRenameSession(sessionId, editTitle.trim());
        }
        setEditingId(null);
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditTitle('');
    };

    const handleDelete = (sessionId: string) => {
        if (window.confirm('Delete this chat? This cannot be undone.')) {
            onDeleteSession(sessionId);
            setMenuOpenId(null);
        }
    };

    // Sort sessions by most recent first
    const sortedSessions = [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);

    return (
        <aside className="session-sidebar">
            <div className="sidebar-header">
                <h2>Chat History</h2>
                <button className="close-sidebar-btn" onClick={onClose} title="Close sidebar">
                    ✕
                </button>
            </div>

            <button className="new-session-btn" onClick={onNewSession}>
                ➕ New Chat
            </button>

            <div className="sessions-list">
                {sortedSessions.length === 0 ? (
                    <div className="empty-state">
                        <p>No chats yet</p>
                        <p>Start a new conversation!</p>
                    </div>
                ) : (
                    sortedSessions.map((session) => (
                        <div
                            key={session.id}
                            className={`session-item ${currentSessionId === session.id ? 'active' : ''}`}
                        >
                            {editingId === session.id ? (
                                <div className="session-edit">
                                    <input
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') handleSaveEdit(session.id);
                                            if (e.key === 'Escape') handleCancelEdit();
                                        }}
                                        autoFocus
                                        className="edit-input"
                                    />
                                    <div className="edit-actions">
                                        <button onClick={() => handleSaveEdit(session.id)} className="save-btn">
                                            ✓
                                        </button>
                                        <button onClick={handleCancelEdit} className="cancel-btn">
                                            ✕
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div
                                        className="session-content"
                                        onClick={() => onSessionClick(session.id)}
                                    >
                                        <div className="session-title">{session.title}</div>
                                        <div className="session-meta">
                                            <span className="session-time">
                                                {formatTimestamp(session.updatedAt)}
                                            </span>
                                            <span className="session-count">
                                                {session.messages.length} messages
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        className="session-menu-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMenuOpenId(menuOpenId === session.id ? null : session.id);
                                        }}
                                    >
                                        ⋮
                                    </button>

                                    {menuOpenId === session.id && (
                                        <div className="session-menu" ref={menuRef}>
                                            <button onClick={() => handleStartEdit(session)}>
                                                ✏️ Rename
                                            </button>
                                            <button onClick={() => handleDelete(session.id)} className="delete">
                                                🗑️ Delete
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>

            <div className="sidebar-footer">
                <div className="session-stats">
                    <span>{sessions.length} total chats</span>
                </div>
            </div>
        </aside>
    );
}
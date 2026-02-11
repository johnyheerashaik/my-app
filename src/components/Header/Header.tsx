import './Header.css';

type HeaderProps = {
    isStreaming: boolean;
    status: string;
};

export function Header({ isStreaming, status }: HeaderProps) {
    return (
        <>
            {isStreaming && <div className="progress-bar"></div>}
            <header className="topbar">
                <div className="brand">My WebBot</div>
                <div className={`status ${isStreaming ? "active" : ""}`}>
                    {isStreaming && (
                        <span className="status-icon">
                            <span className="pulse-dot"></span>
                        </span>
                    )}
                    <span className="status-text">{status}</span>
                    {isStreaming && <span className="status-dots"></span>}
                </div>
            </header>
        </>
    );
}

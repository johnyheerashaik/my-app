import { KEYBOARD_SHORTCUTS } from '../../types';
import './ShortcutsModal.css';

interface ShortcutsModalProps {
    onClose: () => void;
}

export function ShortcutsModal({ onClose }: ShortcutsModalProps) {
    const formatKey = (key: string, ctrl?: boolean, meta?: boolean, shift?: boolean, alt?: boolean) => {
        const parts: string[] = [];

        if (ctrl) parts.push('Ctrl');
        if (meta) parts.push('⌘'); // Command on Mac
        if (shift) parts.push('Shift');
        if (alt) parts.push('Alt');
        parts.push(key === ' ' ? 'Space' : key);

        return parts.join(' + ');
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>⌨️ Keyboard Shortcuts</h2>
                    <button className="modal-close-btn" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="shortcuts-grid">
                    {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                        <div key={index} className="shortcut-item">
                            <div className="shortcut-keys">
                                <kbd>
                                    {formatKey(
                                        shortcut.key,
                                        shortcut.ctrl,
                                        shortcut.meta,
                                        shortcut.shift,
                                        shortcut.alt
                                    )}
                                </kbd>
                            </div>
                            <div className="shortcut-description">{shortcut.description}</div>
                        </div>
                    ))}
                </div>

                <div className="modal-footer">
                    <p>Press <kbd>Esc</kbd> or click outside to close</p>
                </div>
            </div>
        </div>
    );
}

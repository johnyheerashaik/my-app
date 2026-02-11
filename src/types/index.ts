// ============================================================================
// CORE TYPES
// ============================================================================

export interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
    reaction?: '👍' | '👎' | null;
    attachments?: string[];
    error?: ErrorResponse;
    retryable?: boolean;
}

export interface CodeBlock {
    language: string;
    code: string;
}

export interface Session {
    id: string;
    title: string;
    messages: Message[];
    createdAt: number;
    updatedAt: number;
}

export interface CodeBlock {
    language: string;
    code: string;
}


// ============================================================================
// ERROR HANDLING
// ============================================================================

export interface ErrorResponse {
    type: 'network' | 'server' | 'timeout' | 'abort';
    message: string;
    retryable: boolean;
}

// ============================================================================
// USAGE TRACKING
// ============================================================================

export interface Usage {
    promptTokens: number;
    completionTokens: number;
    totalCost: number;
}

// ============================================================================
// FILE ATTACHMENTS
// ============================================================================

export interface FileAttachment {
    name: string;
    size: number;
    type: string;
    content?: string; // For text files
    base64?: string;  // For binary files
}

// ============================================================================
// BACKEND HEALTH
// ============================================================================

export interface HealthStatus {
    status: 'online' | 'offline' | 'checking';
    lastChecked: number;
    latency?: number;
}

// ============================================================================
// STREAMING
// ============================================================================

export interface StreamChunk {
    type: 'text' | 'usage' | 'error' | 'done';
    content?: string;
    usage?: Usage;
    error?: ErrorResponse;
}

// ============================================================================
// CHAT CONFIGURATION
// ============================================================================

export interface ChatConfig {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

let idCounter = 0;

export function makeId(): string {
    return `msg_${Date.now()}_${++idCounter}_${Math.random().toString(36).slice(2, 9)}`;
}

export function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 1 minute
    if (diff < 60000) {
        return 'Just now';
    }

    // Less than 1 hour
    if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000);
        return `${minutes}m ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000);
        return `${hours}h ago`;
    }

    // Less than 7 days
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `${days}d ago`;
    }

    // More than 7 days - show date
    return date.toLocaleDateString();
}

export function formatTokenCount(tokens: number): string {
    if (tokens < 1000) {
        return `${tokens}`;
    }
    return `${(tokens / 1000).toFixed(1)}K`;
}

export function formatCost(cost: number): string {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return '<$0.01';
    return `$${cost.toFixed(2)}`;
}

export function estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
}

export function truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength - 3) + '...';
}

// ============================================================================
// VALIDATORS
// ============================================================================

export function isValidMessage(message: unknown): message is Message {
    if (typeof message !== 'object' || message === null) return false;

    const msg = message as Partial<Message>;

    return (
        typeof msg.id === 'string' &&
        (msg.role === 'user' || msg.role === 'assistant') &&
        typeof msg.content === 'string' &&
        typeof msg.timestamp === 'number'
    );
}

export function isValidSession(session: unknown): session is Session {
    if (typeof session !== 'object' || session === null) return false;

    const sess = session as Partial<Session>;

    return (
        typeof sess.id === 'string' &&
        typeof sess.title === 'string' &&
        Array.isArray(sess.messages) &&
        sess.messages.every(isValidMessage) &&
        typeof sess.createdAt === 'number' &&
        typeof sess.updatedAt === 'number'
    );
}

// ============================================================================
// CONSTANTS
// ============================================================================

export const MAX_MESSAGE_LENGTH = 10000;
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_MESSAGE = 5;
export const ALLOWED_FILE_TYPES = [
    'text/plain',
    'text/markdown',
    'text/csv',
    'application/json',
    'text/javascript',
    'text/typescript',
    'text/html',
    'text/css',
];

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

export interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    meta?: boolean;
    shift?: boolean;
    alt?: boolean;
    description: string;
    action: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
    {
        key: 'Enter',
        ctrl: true,
        description: 'Send message',
        action: 'send',
    },
    {
        key: 'Enter',
        meta: true,
        description: 'Send message (Mac)',
        action: 'send',
    },
    {
        key: 'Escape',
        description: 'Stop generation',
        action: 'stop',
    },
    {
        key: 'k',
        ctrl: true,
        description: 'New chat',
        action: 'new',
    },
    {
        key: 'k',
        meta: true,
        description: 'New chat (Mac)',
        action: 'new',
    },
    {
        key: 'l',
        ctrl: true,
        description: 'Clear chat',
        action: 'clear',
    },
    {
        key: 'l',
        meta: true,
        description: 'Clear chat (Mac)',
        action: 'clear',
    },
    {
        key: 'e',
        ctrl: true,
        description: 'Export chat',
        action: 'export',
    },
    {
        key: 'e',
        meta: true,
        description: 'Export chat (Mac)',
        action: 'export',
    },
];
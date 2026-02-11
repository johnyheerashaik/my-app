export type Role = "user" | "assistant";

export type Message = {
    id: string;
    role: Role;
    content: string;
    status?: string;
};

export type CodeBlock = {
    language: string;
    code: string;
};

export function makeId(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

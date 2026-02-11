import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

const WORKSPACE_ROOT = path.resolve(process.cwd());

function resolveInsideRoot(relativePath: string): string {
    const cleaned = relativePath.replace(/^\/+/, "");
    const abs = path.resolve(WORKSPACE_ROOT, cleaned);
    if (!abs.startsWith(WORKSPACE_ROOT + path.sep) && abs !== WORKSPACE_ROOT) {
        throw new Error("Path escapes workspace root");
    }
    return abs;
}

export async function readTextFile(relativePath: string, maxBytes = 250_000): Promise<string> {
    const abs = resolveInsideRoot(relativePath);
    const stat = await fs.stat(abs);
    if (!stat.isFile()) throw new Error("Not a file");
    if (stat.size > maxBytes) {
        throw new Error(`File too large (${stat.size} bytes). Limit is ${maxBytes}.`);
    }
    return await fs.readFile(abs, "utf8");
}

export async function listDir(relativePath: string): Promise<string[]> {
    const abs = resolveInsideRoot(relativePath);
    const entries = await fs.readdir(abs, { withFileTypes: true });
    return entries
        .filter((e) => e.name !== ".git")
        .map((e) => (e.isDirectory() ? `${e.name}/` : e.name));
}

type SearchResult = {
    path: string;
    line: number;
    text: string;
};

const DEFAULT_IGNORES = new Set(["node_modules", "dist", "dist-ssr", ".git"]);

async function walkFiles(
    dirAbs: string,
    dirRel: string,
    out: string[],
    options: { maxFiles: number }
): Promise<void> {
    if (out.length >= options.maxFiles) return;
    const entries = await fs.readdir(dirAbs, { withFileTypes: true });
    for (const entry of entries) {
        if (out.length >= options.maxFiles) return;
        if (DEFAULT_IGNORES.has(entry.name)) continue;

        const nextAbs = path.join(dirAbs, entry.name);
        const nextRel = dirRel ? `${dirRel}/${entry.name}` : entry.name;

        if (entry.isDirectory()) {
            await walkFiles(nextAbs, nextRel, out, options);
            continue;
        }

        if (entry.isFile()) out.push(nextRel);
    }
}

export async function searchText(
    query: string,
    options?: { maxResults?: number; maxFiles?: number }
): Promise<SearchResult[]> {
    const maxResults = options?.maxResults ?? 50;
    const maxFiles = options?.maxFiles ?? 400;

    const files: string[] = [];
    await walkFiles(WORKSPACE_ROOT, "", files, { maxFiles });

    const results: SearchResult[] = [];
    const isRegex = query.startsWith("/") && query.lastIndexOf("/") > 0;

    let matcher: (line: string) => boolean;
    if (isRegex) {
        const lastSlash = query.lastIndexOf("/");
        const pattern = query.slice(1, lastSlash);
        const flags = query.slice(lastSlash + 1) || "i";
        const re = new RegExp(pattern, flags.includes("g") ? flags.replace("g", "") : flags);
        matcher = (line) => re.test(line);
    } else {
        const needle = query.toLowerCase();
        matcher = (line) => line.toLowerCase().includes(needle);
    }

    for (const relPath of files) {
        if (results.length >= maxResults) break;
        // Skip very large/binary-ish files quickly by extension.
        if (/(^|\.)\b(png|jpg|jpeg|gif|webp|ico|zip|gz|pdf|mp4|mov|lock)\b/i.test(relPath)) continue;

        let content: string;
        try {
            content = await readTextFile(relPath, 400_000);
        } catch {
            continue;
        }

        const lines = content.split(/\r?\n/);
        for (let i = 0; i < lines.length; i += 1) {
            if (matcher(lines[i])) {
                results.push({ path: relPath, line: i + 1, text: lines[i].slice(0, 400) });
                if (results.length >= maxResults) break;
            }
        }
    }

    return results;
}

export async function runNpmScript(
    script: "lint" | "build",
    options?: { timeoutMs?: number; maxOutputChars?: number }
): Promise<{ exitCode: number; output: string }> {
    const timeoutMs = options?.timeoutMs ?? 120_000;
    const maxOutputChars = options?.maxOutputChars ?? 30_000;

    return await new Promise((resolve, reject) => {
        const child = spawn("npm", ["run", script], {
            cwd: WORKSPACE_ROOT,
            stdio: ["ignore", "pipe", "pipe"],
            env: process.env,
        });

        let output = "";
        const onData = (chunk: Buffer) => {
            if (output.length >= maxOutputChars) return;
            output += chunk.toString("utf8");
            if (output.length > maxOutputChars) output = output.slice(0, maxOutputChars);
        };

        child.stdout.on("data", onData);
        child.stderr.on("data", onData);

        const timer = setTimeout(() => {
            child.kill("SIGKILL");
            resolve({ exitCode: 124, output: output + "\n[Timed out]" });
        }, timeoutMs);

        child.on("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });

        child.on("close", (code) => {
            clearTimeout(timer);
            resolve({ exitCode: code ?? 0, output });
        });
    });
}

// ============ NEW TOOLS FOR CODE MODIFICATION ============

export async function writeFile(relativePath: string, content: string): Promise<string> {
    const abs = resolveInsideRoot(relativePath);

    // Create directory if it doesn't exist
    const dir = path.dirname(abs);
    await fs.mkdir(dir, { recursive: true });

    // Write the file
    await fs.writeFile(abs, content, "utf8");
    return `Successfully wrote ${content.length} bytes to ${relativePath}`;
}

export async function replaceInFile(
    relativePath: string,
    oldText: string,
    newText: string
): Promise<string> {
    const abs = resolveInsideRoot(relativePath);
    let content = await fs.readFile(abs, "utf8");

    if (!content.includes(oldText)) {
        throw new Error(`Old text not found in ${relativePath}`);
    }

    // Count occurrences
    const occurrences = content.split(oldText).length - 1;

    content = content.replace(oldText, newText);
    await fs.writeFile(abs, content, "utf8");

    return `Replaced ${occurrences} occurrence(s) in ${relativePath}`;
}

export async function runCommand(
    command: string,
    options?: { timeoutMs?: number; maxOutputChars?: number }
): Promise<{ exitCode: number; output: string }> {
    const timeoutMs = options?.timeoutMs ?? 60_000;
    const maxOutputChars = options?.maxOutputChars ?? 20_000;

    return await new Promise((resolve, reject) => {
        // Split command into parts for spawn
        const parts = command.split(/\s+/);
        const cmd = parts[0];
        const args = parts.slice(1);

        const child = spawn(cmd, args, {
            cwd: WORKSPACE_ROOT,
            stdio: ["ignore", "pipe", "pipe"],
            env: process.env,
            shell: true,
        });

        let output = "";
        const onData = (chunk: Buffer) => {
            if (output.length >= maxOutputChars) return;
            output += chunk.toString("utf8");
            if (output.length > maxOutputChars) output = output.slice(0, maxOutputChars);
        };

        child.stdout.on("data", onData);
        child.stderr.on("data", onData);

        const timer = setTimeout(() => {
            child.kill("SIGKILL");
            resolve({ exitCode: 124, output: output + "\n[Timed out]" });
        }, timeoutMs);

        child.on("error", (err) => {
            clearTimeout(timer);
            reject(err);
        });

        child.on("close", (code) => {
            clearTimeout(timer);
            resolve({ exitCode: code ?? 0, output });
        });
    });
}

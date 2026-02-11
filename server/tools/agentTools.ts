import { z } from "zod";
import { DynamicStructuredTool } from "@langchain/core/tools";
import {
    listDir,
    readTextFile,
    runNpmScript,
    searchText,
    writeFile,
    replaceInFile,
    runCommand,
} from "../repoTools.js";

export function makeTools() {
    const readFileTool = new DynamicStructuredTool({
        name: "read_file",
        description: "Read a UTF-8 text file from the repo. Provide a relative path.",
        schema: z.object({ path: z.string().min(1) }),
        func: async ({ path }) => await readTextFile(path),
    });

    const listDirTool = new DynamicStructuredTool({
        name: "list_dir",
        description: "List files/folders in a directory. Provide a relative path (use '.' for root).",
        schema: z.object({ path: z.string().min(1) }),
        func: async ({ path }) => JSON.stringify(await listDir(path || ".")),
    });

    const searchTool = new DynamicStructuredTool({
        name: "search",
        description:
            "Search for text in the repo. query can be a plain string or a regex like /pattern/i.",
        schema: z.object({ query: z.string().min(1) }),
        func: async ({ query }) => JSON.stringify(await searchText(query), null, 2),
    });

    const runChecksTool = new DynamicStructuredTool({
        name: "run_checks",
        description: "Run repo checks. script must be one of: lint, build.",
        schema: z.object({ script: z.enum(["lint", "build"]) }),
        func: async ({ script }) => {
            const result = await runNpmScript(script);
            return JSON.stringify(result, null, 2);
        },
    });

    const writeFileTool = new DynamicStructuredTool({
        name: "write_file",
        description:
            "Write content to a file. Creates new file or overwrites existing. Use for creating new files or complete rewrites.",
        schema: z.object({
            path: z.string().min(1),
            content: z.string(),
        }),
        func: async ({ path, content }) => await writeFile(path, content),
    });

    const replaceInFileTool = new DynamicStructuredTool({
        name: "replace_in_file",
        description:
            "Replace text in a file. oldText must match exactly (whitespace matters). Use for surgical edits. Read the file first to get exact text.",
        schema: z.object({
            path: z.string().min(1),
            oldText: z.string().min(1),
            newText: z.string(),
        }),
        func: async ({ path, oldText, newText }) => await replaceInFile(path, oldText, newText),
    });

    const runCommandTool = new DynamicStructuredTool({
        name: "run_command",
        description:
            "Run a shell command in the repo directory. Useful for git, npm install, etc. Returns exit code and output.",
        schema: z.object({ command: z.string().min(1) }),
        func: async ({ command }) => {
            const result = await runCommand(command);
            return JSON.stringify(result, null, 2);
        },
    });

    return [
        readFileTool,
        listDirTool,
        searchTool,
        runChecksTool,
        writeFileTool,
        replaceInFileTool,
        runCommandTool,
    ];
}

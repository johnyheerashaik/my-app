import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { systemPrompt } from "./prompts/systemPrompt.js";
import { makeTools } from "./tools/agentTools.js";

type ChatRole = "system" | "user" | "assistant";
export type ChatMessage = { role: Exclude<ChatRole, "system">; content: string };

function requireApiKey(): string {
    const key = process.env.OPENAI_API_KEY;
    if (!key) {
        throw new Error(
            "Missing OPENAI_API_KEY. Create a .env file (see .env.example) and restart the agent server."
        );
    }
    return key;
}

export async function runAgent(params: {
    messages: ChatMessage[];
}): Promise<string> {
    requireApiKey();

    const tools = makeTools();

    const modelName = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const model = new ChatOpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        model: modelName,
        temperature: 0.2,
    }).bindTools(tools);

    const history = [new SystemMessage(systemPrompt)];
    for (const msg of params.messages) {
        if (msg.role === "user") history.push(new HumanMessage(msg.content));
        else history.push(new AIMessage(msg.content));
    }

    // Tool-calling loop with configurable max steps (essentially unlimited by default)
    const maxSteps = Number(process.env.AGENT_MAX_STEPS || 200);
    let scratch = history;
    for (let step = 0; step < maxSteps; step += 1) {
        const ai = await model.invoke(scratch);
        scratch = [...scratch, ai];

        const toolCalls = ai.additional_kwargs?.tool_calls as Array<{
            id: string;
            type: string;
            function: { name: string; arguments: string };
        }> | undefined;

        if (!toolCalls || toolCalls.length === 0) {
            return typeof ai.content === "string" ? ai.content : JSON.stringify(ai.content);
        }

        for (const call of toolCalls) {
            const toolName = call.function.name;
            const tool = tools.find((t) => t.name === toolName);
            if (!tool) {
                scratch = [...scratch, new ToolMessage({ content: `Unknown tool: ${toolName}`, tool_call_id: call.id })];
                continue;
            }

            try {
                const args = JSON.parse(call.function.arguments);
                const observation = await tool.func(args);
                scratch = [...scratch, new ToolMessage({ content: String(observation), tool_call_id: call.id })];
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                scratch = [...scratch, new ToolMessage({ content: `Tool error: ${message}`, tool_call_id: call.id })];
            }
        }
    }

    return `I've reached the maximum number of tool calls (${maxSteps} steps) for this task. I've made progress, but the task may need to be broken into smaller parts. You can increase this limit by setting AGENT_MAX_STEPS environment variable, or ask me to continue from where I left off.`;
}

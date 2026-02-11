import "dotenv/config";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { runAgent } from "./agent.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
});

const chatSchema = z.object({
    messages: z
        .array(
            z.object({
                role: z.enum(["user", "assistant"]),
                content: z.string(),
            })
        )
        .min(1),
});

app.post("/api/chat/stream", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");

    // If running behind proxies, this helps keep SSE flowing.
    res.flushHeaders?.();

    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ message: "Invalid request" })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
        return;
    }

    try {
        const answer = await runAgent({ messages: parsed.data.messages });

        // Stream as small chunks so the UI feels responsive even if the model isn't token-streaming yet.
        const chunkSize = 24;
        for (let i = 0; i < answer.length; i += chunkSize) {
            const chunk = answer.slice(i, i + chunkSize);
            res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        }
        res.write(`data: [DONE]\n\n`);
        res.end();
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify({ message })}\n\n`);
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
    // eslint-disable-next-line no-console
    console.log(`[agent] listening on http://localhost:${port}`);
});

#!/usr/bin/env node
/**
 * Cosmic Duck MCP Server — Claude Code integration for Quantum AI.
 *
 * Exposes generate_image, generate_video, text_to_speech, transcribe,
 * generate_music, web_search, rag_search, and list_models as MCP tools.
 *
 * Claude Code auto-discovers these tools via MCP config and uses them
 * autonomously during tasks. All calls go through api.quantumencoding.ai
 * with the user's QAI API key for billing.
 *
 * Setup:
 *   QAI_API_KEY=qai_xxx npx @quantum-encoding/cosmic-duck-mcp
 *
 * Or in ~/.claude/mcp.json:
 *   { "servers": { "cosmic-duck": {
 *       "command": "npx",
 *       "args": ["@quantum-encoding/cosmic-duck-mcp"],
 *       "env": { "QAI_API_KEY": "qai_xxx" }
 *   }}}
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
const API_BASE = process.env.QAI_BASE_URL || "https://api.quantumencoding.ai";
const API_KEY = process.env.QAI_API_KEY || "";
if (!API_KEY) {
    console.error("Error: QAI_API_KEY environment variable is required");
    process.exit(1);
}
// ── API helper ──
async function qaiPost(path, body) {
    const resp = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "X-API-Key": API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(`QAI API ${resp.status}: ${text.slice(0, 500)}`);
    }
    return resp.json();
}
async function qaiGet(path) {
    const resp = await fetch(`${API_BASE}${path}`, {
        headers: {
            "Authorization": `Bearer ${API_KEY}`,
            "X-API-Key": API_KEY,
        },
    });
    if (!resp.ok)
        throw new Error(`QAI API ${resp.status}`);
    return resp.json();
}
// ── MCP Server ──
const server = new McpServer({
    name: "cosmic-duck",
    version: "0.1.0",
});
// ── Tools ──
server.tool("generate_image", "Generate an image using AI. Returns base64 image data. Supports multiple providers: xAI Imagine, OpenAI GPT Image, DALL-E 3, Google Imagen, Gemini Flash.", {
    prompt: z.string().describe("Detailed description of the image to generate"),
    model: z.string().optional().describe("Model ID (default: grok-imagine-image). Options: grok-imagine-image, gpt-image-1, dall-e-3, gemini-2.5-flash-image, imagen-4.0-generate-001"),
    count: z.number().optional().describe("Number of images (1-4, default 1)"),
    aspect_ratio: z.string().optional().describe("Aspect ratio e.g. '1:1', '16:9', '9:16'"),
    size: z.string().optional().describe("Size e.g. '1024x1024', '1536x1024'"),
}, async ({ prompt, model, count, aspect_ratio, size }) => {
    const resp = await qaiPost("/qai/v1/images/generate", {
        model: model || "grok-imagine-image",
        prompt,
        count: count || 1,
        aspect_ratio,
        size,
    });
    const images = resp.images || [];
    const content = [];
    for (const img of images) {
        if (img.base64) {
            content.push({
                type: "image",
                data: img.base64,
                mimeType: `image/${img.format || "png"}`,
            });
        }
    }
    if (content.length === 0) {
        return { content: [{ type: "text", text: "No images returned" }] };
    }
    content.push({
        type: "text",
        text: `Generated ${images.length} image(s) for: "${prompt}"`,
    });
    return { content };
});
server.tool("edit_image", "Edit an existing image using AI. Pass the base64 image data and a prompt describing the edit.", {
    prompt: z.string().describe("Describe the edit to make"),
    image_base64: z.string().describe("Base64-encoded source image"),
    model: z.string().optional().describe("Model (default: gpt-image-1)"),
}, async ({ prompt, image_base64, model }) => {
    const resp = await qaiPost("/qai/v1/images/edit", {
        model: model || "gpt-image-1",
        prompt,
        input_images: [image_base64],
        count: 1,
    });
    const images = resp.images || [];
    const content = [];
    for (const img of images) {
        if (img.base64) {
            content.push({
                type: "image",
                data: img.base64,
                mimeType: `image/${img.format || "png"}`,
            });
        }
    }
    content.push({ type: "text", text: `Edited image: ${images.length} result(s)` });
    return { content };
});
server.tool("generate_video", "Generate a short video clip using AI. Returns when the job is queued — video generation takes 1-5 minutes.", {
    prompt: z.string().describe("Video scene description"),
    model: z.string().optional().describe("Model (default: grok-imagine-video). Options: grok-imagine-video, sora-2, veo-3.1-generate-001"),
    duration_seconds: z.number().optional().describe("Duration in seconds (4-12, default 8)"),
}, async ({ prompt, model, duration_seconds }) => {
    const resp = await qaiPost("/qai/v1/jobs", {
        job_type: "video/generate",
        params: {
            model: model || "grok-imagine-video",
            prompt,
            duration_seconds: duration_seconds || 8,
        },
    });
    return {
        content: [{
                type: "text",
                text: `Video generation queued (job: ${resp.job_id}). It will take 1-5 minutes. Prompt: "${prompt}"`,
            }],
    };
});
server.tool("text_to_speech", "Convert text to speech audio. Returns base64 audio data.", {
    text: z.string().describe("Text to convert to speech"),
    voice: z.string().optional().describe("Voice (default: alloy). Options: alloy, echo, fable, onyx, nova, shimmer"),
    model: z.string().optional().describe("Model (default: tts-1). Options: tts-1, eleven_multilingual_v2, grok-3-tts"),
}, async ({ text, voice, model }) => {
    const resp = await qaiPost("/qai/v1/audio/speak", {
        model: model || "tts-1",
        text,
        voice: voice || "alloy",
        output_format: "mp3",
    });
    return {
        content: [
            {
                type: "resource",
                resource: {
                    uri: `data:audio/mp3;base64,${resp.audio_base64}`,
                    mimeType: "audio/mp3",
                    text: resp.audio_base64,
                },
            },
            { type: "text", text: `Generated speech (${resp.format}, ${resp.size_bytes} bytes)` },
        ],
    };
});
server.tool("transcribe", "Transcribe audio to text using speech-to-text.", {
    audio_base64: z.string().describe("Base64-encoded audio file"),
    model: z.string().optional().describe("Model (default: whisper-1)"),
    language: z.string().optional().describe("Language code e.g. 'en', 'es'"),
}, async ({ audio_base64, model, language }) => {
    const resp = await qaiPost("/qai/v1/audio/transcribe", {
        model: model || "whisper-1",
        audio_base64,
        language,
    });
    return {
        content: [{ type: "text", text: resp.text || "No transcription returned" }],
    };
});
server.tool("generate_music", "Generate music from a text description.", {
    prompt: z.string().describe("Music description (style, mood, instruments)"),
    duration_seconds: z.number().optional().describe("Duration (15, 30, or 60 seconds)"),
}, async ({ prompt, duration_seconds }) => {
    const resp = await qaiPost("/qai/v1/audio/music", {
        model: "lyria-002",
        prompt,
        duration_seconds: duration_seconds || 30,
    });
    const clips = resp.audio_clips || [];
    return {
        content: [{
                type: "text",
                text: `Generated ${clips.length} music clip(s) for: "${prompt}"`,
            }],
    };
});
server.tool("rag_search", "Search the knowledge base for documentation. Searches provider API docs (xAI, Claude, OpenAI, SurrealDB, etc.) and language specs.", {
    query: z.string().describe("Search query"),
    provider: z.string().optional().describe("Filter by provider (xai, claude, openai, surrealdb, deepseek, gemini)"),
}, async ({ query, provider }) => {
    const resp = await qaiPost("/qai/v1/rag/surreal/search", {
        query,
        provider,
        limit: 5,
    });
    const results = resp.results || [];
    if (results.length === 0) {
        return { content: [{ type: "text", text: "No results found." }] };
    }
    const text = results.map((r, i) => `${i + 1}. **${r.title}** (${r.provider})\n${r.heading ? `   ${r.heading}\n` : ""}   ${r.content.slice(0, 600)}\n`).join("\n");
    return { content: [{ type: "text", text }] };
});
server.tool("list_models", "List all available AI models with pricing. Use this to see what models are available for image, video, chat, and audio generation.", {}, async () => {
    const resp = await qaiGet("/qai/v1/models");
    const models = resp.models || resp || [];
    const text = models.map((m) => `${m.id} (${m.provider}) — ${m.display_name} | $${m.input_per_million}/M in, $${m.output_per_million}/M out`).join("\n");
    return { content: [{ type: "text", text: text || "No models returned" }] };
});
server.tool("account_balance", "Check the user's Quantum AI credit balance.", {}, async () => {
    const resp = await qaiGet("/qai/v1/account/balance");
    return {
        content: [{
                type: "text",
                text: `Balance: ${resp.balance_display || resp.balance || "unknown"}`,
            }],
    };
});
// ── Start ──
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
}
main().catch((err) => {
    console.error("MCP server error:", err);
    process.exit(1);
});

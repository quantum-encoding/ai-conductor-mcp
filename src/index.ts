#!/usr/bin/env node

/**
 * AI Conductor MCP Server — Claude Code integration for Quantum AI.
 *
 * Exposes 18 tools: image gen/edit, video, TTS, STT, music, sound effects,
 * web search, RAG search, screenshots, doc scraping, code scanning,
 * voice cloning, GPU rental, chat, and account management.
 *
 * Claude Code auto-discovers these tools via MCP config and uses them
 * autonomously during tasks. All calls go through api.quantumencoding.ai
 * with the user's QAI API key for billing.
 *
 * Setup:
 *   QAI_API_KEY=qai_xxx npx @quantum-encoding/ai-conductor-mcp
 *
 * Or in ~/.claude/mcp.json:
 *   { "servers": { "cosmic-duck": {
 *       "command": "npx",
 *       "args": ["@quantum-encoding/ai-conductor-mcp"],
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

async function qaiPost(path: string, body: Record<string, unknown>): Promise<unknown> {
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

async function qaiGet(path: string): Promise<unknown> {
  const resp = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "X-API-Key": API_KEY,
    },
  });
  if (!resp.ok) throw new Error(`QAI API ${resp.status}`);
  return resp.json();
}

// ── MCP Server ──

const server = new McpServer({
  name: "ai-conductor",
  version: "0.4.0",
});

// ── Tools ──

server.tool(
  "generate_image",
  "Generate an image using AI. Returns base64 image data. Supports multiple providers: xAI Imagine, OpenAI GPT Image, DALL-E 3, Google Imagen, Gemini Flash.",
  {
    prompt: z.string().describe("Detailed description of the image to generate"),
    model: z.string().optional().describe("Image model (default: grok-imagine-image). Use list_models for all options."),
    count: z.number().optional().describe("Number of images (1-4, default 1)"),
    aspect_ratio: z.string().optional().describe("Aspect ratio e.g. '1:1', '16:9', '9:16'"),
    size: z.string().optional().describe("Size e.g. '1024x1024', '1536x1024'"),
  },
  async ({ prompt, model, count, aspect_ratio, size }) => {
    const resp = await qaiPost("/qai/v1/images/generate", {
      model: model || "grok-imagine-image",
      prompt,
      count: count || 1,
      aspect_ratio,
      size,
    }) as any;

    const images = resp.images || [];
    const content: any[] = [];

    for (const img of images) {
      if (img.base64) {
        content.push({
          type: "image" as const,
          data: img.base64,
          mimeType: `image/${img.format || "png"}`,
        });
      }
    }

    if (content.length === 0) {
      return { content: [{ type: "text" as const, text: "No images returned" }] };
    }

    content.push({
      type: "text" as const,
      text: `Generated ${images.length} image(s) for: "${prompt}"`,
    });

    return { content };
  }
);

server.tool(
  "edit_image",
  "Edit an existing image using AI. Pass the base64 image data and a prompt describing the edit.",
  {
    prompt: z.string().describe("Describe the edit to make"),
    image_base64: z.string().describe("Base64-encoded source image"),
    model: z.string().optional().describe("Edit model (default: gpt-image-1)"),
  },
  async ({ prompt, image_base64, model }) => {
    const resp = await qaiPost("/qai/v1/images/edit", {
      model: model || "gpt-image-1",
      prompt,
      input_images: [image_base64],
      count: 1,
    }) as any;

    const images = resp.images || [];
    const content: any[] = [];

    for (const img of images) {
      if (img.base64) {
        content.push({
          type: "image" as const,
          data: img.base64,
          mimeType: `image/${img.format || "png"}`,
        });
      }
    }

    content.push({ type: "text" as const, text: `Edited image: ${images.length} result(s)` });
    return { content };
  }
);

server.tool(
  "generate_video",
  "Generate a short video clip using AI. Returns when the job is queued — video generation takes 1-5 minutes.",
  {
    prompt: z.string().describe("Video scene description"),
    model: z.string().optional().describe("Video model (default: grok-imagine-video). Use list_models for all options."),
    duration_seconds: z.number().optional().describe("Duration in seconds (4-12, default 8)"),
  },
  async ({ prompt, model, duration_seconds }) => {
    const resp = await qaiPost("/qai/v1/jobs", {
      job_type: "video/generate",
      params: {
        model: model || "grok-imagine-video",
        prompt,
        duration_seconds: duration_seconds || 8,
      },
    }) as any;

    return {
      content: [{
        type: "text" as const,
        text: `Video generation queued (job: ${resp.job_id}). It will take 1-5 minutes. Prompt: "${prompt}"`,
      }],
    };
  }
);

server.tool(
  "text_to_speech",
  "Convert text to speech audio. Returns base64 audio data.",
  {
    text: z.string().describe("Text to convert to speech"),
    voice: z.string().optional().describe("Voice (default: alloy). Common: alloy, echo, fable, onyx, nova, shimmer"),
    model: z.string().optional().describe("TTS model (default: tts-1). Use list_models for all options."),
  },
  async ({ text, voice, model }) => {
    const resp = await qaiPost("/qai/v1/audio/tts", {
      model: model || "tts-1",
      text,
      voice: voice || "alloy",
      output_format: "mp3",
    }) as any;

    return {
      content: [
        {
          type: "resource" as const,
          resource: {
            uri: `data:audio/mp3;base64,${resp.audio_base64}`,
            mimeType: "audio/mp3",
            text: resp.audio_base64,
          },
        },
        { type: "text" as const, text: `Generated speech (${resp.format}, ${resp.size_bytes} bytes)` },
      ],
    };
  }
);

server.tool(
  "transcribe",
  "Transcribe audio to text using speech-to-text.",
  {
    audio_base64: z.string().describe("Base64-encoded audio file"),
    model: z.string().optional().describe("STT model (default: whisper-1)"),
    language: z.string().optional().describe("Language code e.g. 'en', 'es'"),
  },
  async ({ audio_base64, model, language }) => {
    const resp = await qaiPost("/qai/v1/audio/stt", {
      model: model || "whisper-1",
      audio_base64,
      language,
    }) as any;

    return {
      content: [{ type: "text" as const, text: resp.text || "No transcription returned" }],
    };
  }
);

server.tool(
  "generate_music",
  "Generate music from a text description.",
  {
    prompt: z.string().describe("Music description (style, mood, instruments)"),
    duration_seconds: z.number().optional().describe("Duration (15, 30, or 60 seconds)"),
  },
  async ({ prompt, duration_seconds }) => {
    const resp = await qaiPost("/qai/v1/audio/music", {
      model: "lyria-002",
      prompt,
      duration_seconds: duration_seconds || 30,
    }) as any;

    const clips = resp.audio_clips || [];
    return {
      content: [{
        type: "text" as const,
        text: `Generated ${clips.length} music clip(s) for: "${prompt}"`,
      }],
    };
  }
);

server.tool(
  "rag_search",
  "Search the knowledge base for documentation. Searches provider API docs (xAI, Claude, OpenAI, SurrealDB, etc.) and language specs.",
  {
    query: z.string().describe("Search query"),
    provider: z.string().optional().describe("Filter by provider (xai, claude, openai, surrealdb, deepseek, gemini)"),
  },
  async ({ query, provider }) => {
    const resp = await qaiPost("/qai/v1/rag/surreal/search", {
      query,
      provider,
      limit: 5,
    }) as any;

    const results = resp.results || [];
    if (results.length === 0) {
      return { content: [{ type: "text" as const, text: "No results found." }] };
    }

    const text = results.map((r: any, i: number) =>
      `${i + 1}. **${r.title}** (${r.provider})\n${r.heading ? `   ${r.heading}\n` : ""}   ${r.content.slice(0, 600)}\n`
    ).join("\n");

    return { content: [{ type: "text" as const, text }] };
  }
);

server.tool(
  "list_models",
  "List all available AI models with pricing. Use this to see what models are available for image, video, chat, and audio generation.",
  {},
  async () => {
    const resp = await qaiGet("/qai/v1/models") as any;
    const models = resp.models || resp || [];

    const text = models.map((m: any) =>
      `${m.id} (${m.provider}) — ${m.display_name} | $${m.input_per_million}/M in, $${m.output_per_million}/M out`
    ).join("\n");

    return { content: [{ type: "text" as const, text: text || "No models returned" }] };
  }
);

server.tool(
  "account_balance",
  "Check the user's Quantum AI credit balance.",
  {},
  async () => {
    const resp = await qaiGet("/qai/v1/account/balance") as any;
    return {
      content: [{
        type: "text" as const,
        text: `Balance: ${resp.balance_display || resp.balance || "unknown"}`,
      }],
    };
  }
);

server.tool(
  "chat",
  "Send a message to any AI model via the Quantum AI gateway. Use this to delegate tasks to other models — e.g. ask Gemini to summarize, Grok to research, DeepSeek to code. Supports all 10 providers.",
  {
    model: z.string().describe("Model ID — use list_models tool to see all available models with pricing. Common: gemini-2.5-flash, claude-sonnet-4-6, grok-4-1-fast-reasoning, deepseek-reasoner, gpt-5-nano"),
    message: z.string().describe("The message/prompt to send"),
    system_prompt: z.string().optional().describe("System prompt to set context"),
    max_tokens: z.number().optional().describe("Max tokens to generate"),
    temperature: z.number().optional().describe("Temperature (0-2)"),
  },
  async ({ model, message, system_prompt, max_tokens, temperature }) => {
    const body: Record<string, unknown> = {
      model,
      messages: [{ role: "user", content: message }],
    };
    if (system_prompt) body.system_prompt = system_prompt;
    if (max_tokens) body.max_tokens = max_tokens;
    if (temperature !== undefined) body.temperature = temperature;

    const resp = await qaiPost("/qai/v1/chat", body) as any;
    const text = resp.content?.[0]?.text || resp.content || JSON.stringify(resp);
    return { content: [{ type: "text" as const, text }] };
  }
);

server.tool(
  "web_search",
  "Search the web using Brave Search. Returns ranked results with titles, URLs, and descriptions.",
  {
    query: z.string().describe("Search query"),
    count: z.number().optional().describe("Number of results (default 5)"),
    freshness: z.string().optional().describe("Time filter: 'pd' (past day), 'pw' (past week), 'pm' (past month)"),
  },
  async ({ query, count, freshness }) => {
    const resp = await qaiPost("/qai/v1/search/web", { query, count: count || 5, freshness }) as any;
    const results = resp.web || [];
    if (results.length === 0) return { content: [{ type: "text" as const, text: "No results found." }] };

    const text = results.map((r: any, i: number) =>
      `${i + 1}. **${r.title}**\n   ${r.url}\n   ${r.description || ""}\n`
    ).join("\n");
    return { content: [{ type: "text" as const, text }] };
  }
);

server.tool(
  "search_context",
  "Get LLM-optimized web content chunks for a query. Better than web_search for grounding — returns extracted page content, not just snippets.",
  {
    query: z.string().describe("Search query"),
    count: z.number().optional().describe("Number of content chunks (default 3)"),
  },
  async ({ query, count }) => {
    const resp = await qaiPost("/qai/v1/search/context", { query, count: count || 3 }) as any;
    const chunks = resp.chunks || [];
    if (chunks.length === 0) return { content: [{ type: "text" as const, text: "No content found." }] };

    const text = chunks.map((c: any) => `### ${c.title}\n${c.url}\n\n${c.content}\n`).join("\n---\n\n");
    return { content: [{ type: "text" as const, text }] };
  }
);

server.tool(
  "sound_effects",
  "Generate sound effects from a text description.",
  {
    prompt: z.string().describe("Sound effect description (e.g. 'thunder crack', 'door creaking open')"),
    duration_seconds: z.number().optional().describe("Duration in seconds"),
  },
  async ({ prompt, duration_seconds }) => {
    const resp = await qaiPost("/qai/v1/audio/sound-effects", { prompt, duration_seconds }) as any;
    return {
      content: [{ type: "text" as const, text: `Generated sound effect: ${resp.format}, ${resp.size_bytes} bytes` }],
    };
  }
);

server.tool(
  "clone_voice",
  "Clone a voice from an audio sample. Returns the new voice ID for use in TTS.",
  {
    name: z.string().describe("Name for the cloned voice"),
    audio_base64: z.string().describe("Base64-encoded audio sample of the voice to clone"),
  },
  async ({ name, audio_base64 }) => {
    const form = new FormData();
    form.append("name", name);
    const blob = new Blob([Buffer.from(audio_base64, "base64")], { type: "audio/mp3" });
    form.append("files", blob, "sample.mp3");

    const resp = await fetch(`${API_BASE}/qai/v1/voices/clone`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${API_KEY}`, "X-API-Key": API_KEY },
      body: form,
    });
    const data = await resp.json() as any;
    return {
      content: [{ type: "text" as const, text: `Voice cloned: ${data.voice_id} (name: ${data.name})` }],
    };
  }
);

server.tool(
  "screenshot",
  "Take screenshots of web pages. Returns base64 PNG images.",
  {
    urls: z.array(z.string()).describe("URLs to screenshot (1-5)"),
    full_page: z.boolean().optional().describe("Capture full scrollable page (default false)"),
    width: z.number().optional().describe("Viewport width (default 1280)"),
    height: z.number().optional().describe("Viewport height (default 800)"),
  },
  async ({ urls, full_page, width, height }) => {
    const resp = await qaiPost("/qai/v1/scraper/screenshot", {
      urls: urls.map(url => ({ url, full_page, width, height })),
    }) as any;

    const content: any[] = [];
    for (const s of (resp.screenshots || [])) {
      if (s.base64 && !s.error) {
        content.push({ type: "image" as const, data: s.base64, mimeType: "image/png" });
      } else if (s.error) {
        content.push({ type: "text" as const, text: `Failed: ${s.url} — ${s.error}` });
      }
    }
    if (content.length === 0) content.push({ type: "text" as const, text: "No screenshots captured" });
    return { content };
  }
);

server.tool(
  "scrape_docs",
  "Scrape documentation from a website. Crawls pages and extracts content. Results stored as an async job.",
  {
    name: z.string().describe("Name for this scrape target"),
    url: z.string().describe("Starting URL to scrape"),
    selector: z.string().optional().describe("CSS selector for nav links (default: 'nav a[href]')"),
    content: z.string().optional().describe("CSS selector for content area (default: 'article, main')"),
    recursive: z.boolean().optional().describe("Follow links recursively (default false)"),
    max_pages: z.number().optional().describe("Max pages to scrape (default 50)"),
  },
  async ({ name, url, selector, content: contentSel, recursive, max_pages }) => {
    const resp = await qaiPost("/qai/v1/scraper/scrape", {
      targets: [{ name, url, selector, content: contentSel, recursive, max_pages: max_pages || 50 }],
    }) as any;
    return {
      content: [{ type: "text" as const, text: `Scrape job submitted: ${resp.job_id}. Poll with job_status tool.` }],
    };
  }
);

server.tool(
  "scan_codebase",
  "Scan a codebase to extract types, fields, and functions. Supports GitHub repos and local paths. Use for understanding code structure.",
  {
    source: z.string().describe("GitHub URL (e.g. github.com/org/repo) or local path"),
    name: z.string().optional().describe("Display name for the scan"),
    languages: z.array(z.string()).optional().describe("Filter languages (rust, go, typescript, python, swift, kotlin)"),
  },
  async ({ source, name, languages }) => {
    const resp = await qaiPost("/qai/v1/scanner/scan", { source, name, languages }) as any;
    const stats = resp.stats || {};
    return {
      content: [{ type: "text" as const, text: `Scan complete: ${resp.name} (${resp.scan_id})\nTypes: ${stats.types}, Fields: ${stats.fields}, Functions: ${stats.functions}\nQuery types with: GET /qai/v1/scanner/scans/${resp.scan_id}/types` }],
    };
  }
);

server.tool(
  "rent_gpu",
  "Provision a GPU or CPU machine on GCE. Returns instance ID and SSH details.",
  {
    template: z.string().describe("Machine template (gpu-t4-1x, gpu-l4-1x, gpu-l4-2x, gpu-a100-40, gpu-a100-80, gpu-h100-80, cpu-e2-4, cpu-e2-8, cpu-c3-8)"),
    zone: z.string().optional().describe("GCE zone (default: us-central1-a)"),
    spot: z.boolean().optional().describe("Use spot/preemptible pricing (up to 70% cheaper)"),
    ssh_public_key: z.string().optional().describe("SSH public key to inject for access"),
    auto_teardown_minutes: z.number().optional().describe("Auto-teardown after inactivity (default 30)"),
  },
  async ({ template, zone, spot, ssh_public_key, auto_teardown_minutes }) => {
    const resp = await qaiPost("/qai/v1/compute/provision", {
      template, zone, spot, ssh_public_key, auto_teardown_minutes,
    }) as any;
    return {
      content: [{ type: "text" as const, text: `GPU provisioned: ${resp.instance_id}\nTemplate: ${template}\nSSH: ${resp.ssh_address || "pending"}\nHourly: $${resp.price_per_hour_usd || "?"}` }],
    };
  }
);

server.tool(
  "job_status",
  "Check the status of an async job (video generation, scraping, screenshots, etc.).",
  {
    job_id: z.string().describe("Job ID to check"),
  },
  async ({ job_id }) => {
    const resp = await qaiGet(`/qai/v1/jobs/${job_id}`) as any;
    return {
      content: [{ type: "text" as const, text: `Job ${job_id}: ${resp.status}${resp.error ? ` — Error: ${resp.error}` : ""}${resp.result ? `\nResult: ${JSON.stringify(resp.result).slice(0, 1000)}` : ""}` }],
    };
  }
);

// ── Start ──

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("MCP server error:", err);
  process.exit(1);
});

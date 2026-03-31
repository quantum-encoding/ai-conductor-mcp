# AI Conductor MCP — Setup Guide

This file is designed to be read by Claude Code to self-configure the AI Conductor
MCP server. Ask Claude: "read SETUP.md from the ai-conductor-mcp package and set me up."

## Step 1: Get an API key

Sign up at [cosmicduck.dev](https://cosmicduck.dev) or create a key programmatically:

```bash
# After authenticating via Google OAuth:
curl -X POST https://api.quantumencoding.ai/qai/v1/keys \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "my-mcp-key"}'
```

The key starts with `qai_k_` — save it, it's only shown once.

**Key options:**
- `spend_cap_usd`: Maximum this key can spend (e.g. 10.00)
- `rate_limit`: Max requests per minute (e.g. 60)
- `expires_at`: RFC3339 expiry date (e.g. "2026-12-31T00:00:00Z")
- `endpoints`: Restrict to specific API paths (e.g. ["/qai/v1/chat"])

## Step 2: Add MCP server config

Add to `~/.claude/mcp.json` (global) or `.mcp.json` (per-project):

```json
{
  "mcpServers": {
    "ai-conductor": {
      "command": "npx",
      "args": ["@quantum-encoding/ai-conductor-mcp"],
      "env": {
        "QAI_API_KEY": "qai_k_YOUR_KEY_HERE"
      }
    }
  }
}
```

## Step 3: Verify it works

In Claude Code, try:
```
Use the account_balance tool to check my balance
```

You should see your credit balance. Then try:
```
Use the chat tool to ask Gemini Flash "hello world"
```

## Recommended key configuration

### For development (personal use)
```json
{
  "name": "dev-mcp",
  "spend_cap_usd": 5.00,
  "rate_limit": 30,
  "expires_at": "2026-06-30T00:00:00Z"
}
```

### For production (app backend)
```json
{
  "name": "production",
  "rate_limit": 120,
  "endpoints": ["/qai/v1/chat", "/qai/v1/images/generate"]
}
```

### For CI/CD (automated tasks)
```json
{
  "name": "ci-pipeline",
  "spend_cap_usd": 1.00,
  "rate_limit": 10,
  "expires_at": "2026-04-30T00:00:00Z",
  "endpoints": ["/qai/v1/chat", "/qai/v1/security/scan-code"]
}
```

## Available tools (19)

### Core
| Tool | What it does |
|------|-------------|
| `chat` | Send messages to any AI model (Claude, Gemini, Grok, GPT-5, DeepSeek) |
| `list_models` | Browse available models with live pricing |
| `account_balance` | Check your credit balance |

### Media generation
| Tool | What it does |
|------|-------------|
| `generate_image` | AI image generation (xAI, OpenAI, Gemini, Imagen) |
| `edit_image` | Edit images with AI |
| `generate_video` | Video generation (Grok, Sora, Veo) |
| `text_to_speech` | Text to speech (OpenAI, ElevenLabs, Grok, HeyGen) |
| `transcribe` | Speech to text (Whisper, Scribe) |
| `generate_music` | Music from text (Lyria) |
| `sound_effects` | Sound effects from text |
| `clone_voice` | Clone a voice from audio sample |

### Web & search
| Tool | What it does |
|------|-------------|
| `web_search` | Brave web search |
| `search_context` | LLM-optimized web content for grounding |
| `rag_search` | Search provider API docs (xAI, Claude, OpenAI, SurrealDB) |
| `screenshot` | Capture web page screenshots |
| `scrape_docs` | Crawl documentation sites |

### Code & infrastructure
| Tool | What it does |
|------|-------------|
| `scan_codebase` | Extract types, fields, functions from codebases (6 languages) |
| `rent_gpu` | Provision GPU/CPU machines on GCE (T4, L4, A100, H100, B200) |
| `job_status` | Check async job progress |

## The conductor pattern

The most powerful pattern is using `chat` to delegate work to cheaper models:

```
You (to Claude): "Research the latest Rust async patterns"

Claude thinks: "I'll delegate this to Gemini Flash — fast and cheap for research"
Claude calls: chat(model: "gemini-2.5-flash", message: "...")
Gemini responds
Claude synthesizes and presents to you
```

Use expensive models (Claude, GPT-5) for planning and synthesis.
Use cheap models (Gemini Flash, DeepSeek) for bulk research and generation.

## Pricing

Credit-based, no subscription. Buy credits at cosmicduck.dev.

| Tier | Margin | Notes |
|------|--------|-------|
| Standard | 25% | Default |
| Developer | 12.5% | Apply at $50+/mo |
| Enterprise | 5% | Negotiate |
| Lifetime | 0% | One-time $299, at-cost forever |

## Troubleshooting

**"invalid API key"**: Check your key starts with `qai_k_`. VWG keys (`vwg_`) also work.

**"insufficient balance"**: Top up at cosmicduck.dev or check balance with `account_balance`.

**"rate limit exceeded"**: Your key has a per-minute rate limit. Wait or create a key with higher limits.

**"spend cap reached"**: This key's budget is exhausted. Create a new key or remove the cap.

**Tool not appearing**: Restart Claude Code after adding the MCP config. Check `/mcp` for status.

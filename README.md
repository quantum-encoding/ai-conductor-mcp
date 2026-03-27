# AI Conductor MCP

MCP server for Claude Code that gives you 19 AI tools through a single API key. Generate images, videos, audio, take screenshots, search the web, scan codebases, rent GPUs, and delegate tasks to any AI model — all from your Claude Code session.

## Quick Setup

```bash
# Add to your project's .mcp.json
{
  "mcpServers": {
    "ai-conductor": {
      "command": "npx",
      "args": ["@quantum-encoding/ai-conductor-mcp"],
      "env": { "QAI_API_KEY": "qai_k_YOUR_KEY" }
    }
  }
}
```

Get your API key at [cosmicduck.dev](https://cosmicduck.dev) or via `POST /qai/v1/auth/google`.

## Tools (19)

### AI Chat Delegation
| Tool | Description |
|------|-------------|
| `chat` | Send a message to any AI model (Gemini, Grok, DeepSeek, GPT-5, Claude). Use this to delegate tasks to cheaper/faster models. |
| `list_models` | List all available models with live pricing |
| `account_balance` | Check your credit balance |

### Image & Video
| Tool | Description |
|------|-------------|
| `generate_image` | Generate images (xAI, OpenAI, DALL-E, Gemini, Imagen) |
| `edit_image` | Edit existing images with AI |
| `generate_video` | Generate video clips (Grok, Sora, Veo) — async job |

### Audio
| Tool | Description |
|------|-------------|
| `text_to_speech` | Convert text to speech (OpenAI, ElevenLabs, Grok, HeyGen) |
| `transcribe` | Speech-to-text transcription (Whisper, Scribe) |
| `generate_music` | Generate music from text descriptions (Lyria) |
| `sound_effects` | Generate sound effects from descriptions |
| `clone_voice` | Clone a voice from an audio sample |

### Web & Search
| Tool | Description |
|------|-------------|
| `web_search` | Brave web search with freshness filters |
| `search_context` | LLM-optimized web content chunks for grounding |
| `rag_search` | Search provider API docs (xAI, Claude, OpenAI, SurrealDB, etc.) |
| `screenshot` | Take screenshots of web pages (1-5 URLs, returns base64 PNG) |
| `scrape_docs` | Crawl documentation sites — async job |

### Code & Infrastructure
| Tool | Description |
|------|-------------|
| `scan_codebase` | Scan a codebase to extract types, fields, functions (6 languages + OpenAPI) |
| `rent_gpu` | Provision a GPU/CPU machine on GCE (T4, L4, A100, H100) |
| `job_status` | Check status of any async job |

## How It Works

All tools call the [Quantum AI API](https://api.quantumencoding.ai) (`api.quantumencoding.ai`). One API key, one billing ledger, 10 providers. Your key never touches provider APIs directly — the gateway handles routing, key management, and cost tracking.

```
Claude Code ──MCP──> AI Conductor ──HTTPS──> Quantum AI API ──> Provider
                                                              ├── Anthropic
                                                              ├── OpenAI
                                                              ├── Google (Gemini/Vertex)
                                                              ├── xAI (Grok)
                                                              ├── DeepSeek
                                                              ├── ElevenLabs
                                                              ├── Meshy (3D)
                                                              ├── HeyGen (Video)
                                                              ├── Z.ai (GLM)
                                                              └── Brave (Search)
```

## The `chat` Tool — Multi-Model Delegation

The most powerful tool. Claude can delegate tasks to other AI models:

```
You: "Research the latest Rust async patterns and summarize"

Claude thinks: "I'll use Gemini Flash for this — fast and cheap for research"
Claude calls: chat(model: "gemini-2.5-flash", message: "Research the latest Rust async patterns...")
Gemini responds with research
Claude summarizes and presents to you
```

This is the conductor pattern — Claude orchestrates, other models execute. Use expensive models for planning, cheap models for bulk work.

## Pricing

Credit-based. No subscription. Buy credits when you need them.

| Tier | Margin | How |
|------|--------|-----|
| Standard | 25% | Default |
| Developer | 12.5% | Apply, $50+/mo |
| Enterprise | 5% | Negotiate |
| **Lifetime** | **0%** | **One-time: $299** |

The Lifetime tier gives you at-cost pricing forever — 0% margin on all 10 providers. Pays for itself in 2-3 months.

## API Reference

Interactive docs: [api.quantumencoding.ai/docs](https://api.quantumencoding.ai/docs)

Full API spec: [api.quantumencoding.ai/openapi.yaml](https://api.quantumencoding.ai/openapi.yaml)

AI-readable docs: [api.quantumencoding.ai/llms.txt](https://api.quantumencoding.ai/llms.txt)

## SDKs

If you want to use the API directly (not through MCP):

| Language | Package |
|----------|---------|
| Rust | `cargo add quantum-sdk` |
| Go | `go get github.com/quantum-encoding/quantum-sdk` |
| TypeScript | `npm i @quantum-encoding/quantum-sdk` |
| Python | `pip install quantum-sdk` |
| Swift | Swift Package Manager |
| Kotlin | Gradle dependency |

## License

MIT

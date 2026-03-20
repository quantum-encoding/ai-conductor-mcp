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
export {};

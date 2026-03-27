#!/usr/bin/env node

/**
 * Setup script: installs AI Conductor MCP server + slash commands into Claude Code.
 *
 * Usage:
 *   npx @quantum-encoding/ai-conductor-mcp setup <QAI_API_KEY>
 *   npx @quantum-encoding/ai-conductor-mcp setup qai_xxx
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "fs";
import { join, dirname } from "path";
import { homedir } from "os";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const apiKey = process.argv[2];
if (!apiKey || !apiKey.startsWith("qai_")) {
  console.error("Usage: ai-conductor-mcp setup <QAI_API_KEY>");
  console.error("  Get your key at https://quantumencoding.ai/dashboard/settings/settings");
  process.exit(1);
}

const home = homedir();
const claudeDir = join(home, ".claude");
const mcpPath = join(claudeDir, "mcp.json");
const commandsDir = join(claudeDir, "commands");

// 1. Install MCP server config
console.log("\n🦆 AI Conductor — Claude Code Setup\n");

mkdirSync(claudeDir, { recursive: true });

let mcpConfig: Record<string, any> = {};
if (existsSync(mcpPath)) {
  try {
    mcpConfig = JSON.parse(readFileSync(mcpPath, "utf-8"));
  } catch {
    mcpConfig = {};
  }
}

if (!mcpConfig.servers) mcpConfig.servers = {};

mcpConfig.servers["ai-conductor"] = {
  command: "npx",
  args: ["@quantum-encoding/ai-conductor-mcp"],
  env: { QAI_API_KEY: apiKey },
};

writeFileSync(mcpPath, JSON.stringify(mcpConfig, null, 2));
console.log("✓ MCP server configured in ~/.claude/mcp.json");

// 2. Install slash commands
mkdirSync(commandsDir, { recursive: true });

const cmdSrcDir = join(__dirname, "..", "claude-commands");
const commands = ["image", "video", "tts", "docs", "models", "music"];

for (const cmd of commands) {
  const src = join(cmdSrcDir, `${cmd}.md`);
  const dst = join(commandsDir, `${cmd}.md`);
  if (existsSync(src)) {
    copyFileSync(src, dst);
    console.log(`✓ Installed //${cmd} command`);
  }
}

// 3. Done
console.log(`
✅ Setup complete!

Claude Code now has:
  • MCP tools: generate_image, generate_video, text_to_speech, rag_search, ...
  • Slash commands: /image, /video, /tts, /docs, /models, /music

Restart Claude Code to activate. Your API key is stored in ~/.claude/mcp.json.

Try: "Generate an image of a rubber duck wearing a top hat and monocle"
`);

#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { getCursorConfig } from "./clients/cursor.js";
import { getClaudeCodeConfig } from "./clients/claude-code.js";
import { getWindsurfConfig } from "./clients/windsurf.js";
import { getClineConfig } from "./clients/cline.js";
import { getRooCodeConfig } from "./clients/roo-code.js";
import { getGeminiConfig } from "./clients/gemini.js";
import { getCodexConfig, serializeCodexConfig } from "./clients/codex.js";
import { getOpenCodeConfig, serializeOpenCodeConfig } from "./clients/opencode.js";
import { mergeConfigs, getChanges } from "./merge.js";
import type { ClientConfig, McpConfig } from "./types.js";

const COLORS = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

function c(color: keyof typeof COLORS, text: string): string {
  return `${COLORS[color]}${text}${COLORS.reset}`;
}

const CLIENT_ALIASES: Record<string, string> = {
  cursor: "Cursor",
  claude: "Claude Code",
  "claude-code": "Claude Code",
  windsurf: "Windsurf",
  cline: "Cline",
  roo: "Roo Code",
  "roo-code": "Roo Code",
  gemini: "Gemini CLI",
  "gemini-cli": "Gemini CLI",
  codex: "Codex",
  opencode: "OpenCode",
};

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    verbose: { type: "boolean", short: "v", default: false },
    help: { type: "boolean", short: "h", default: false },
    version: { type: "boolean", default: false },
    source: { type: "string", short: "s" },
  },
});

function printHelp() {
  console.log(`
${c("bold", "sync-project-mcps")} - Sync project-level MCP configurations across AI coding assistants

${c("bold", "USAGE")}
  npx sync-project-mcps [options]

${c("bold", "OPTIONS")}
  -s, --source  Use specific client as source of truth (cursor, claude, windsurf, cline, roo, gemini, codex, opencode)
  --dry-run     Show what would be synced without writing files
  -v, --verbose Show detailed information
  -h, --help    Show this help message
  --version     Show version

${c("bold", "SUPPORTED CLIENTS")}
  - Cursor      ${c("dim", ".cursor/mcp.json")}
  - Claude Code ${c("dim", ".mcp.json")}
  - Windsurf    ${c("dim", ".windsurf/mcp.json")}
  - Cline       ${c("dim", ".cline/mcp.json")}
  - Roo Code    ${c("dim", ".roo/mcp.json")}
  - Gemini CLI  ${c("dim", ".gemini/settings.json")}
  - Codex       ${c("dim", ".codex/config.toml")}
  - OpenCode    ${c("dim", ".opencode/opencode.jsonc")}

${c("bold", "EXAMPLES")}
  npx sync-project-mcps                    Merge all configs (add-only)
  npx sync-project-mcps -s cursor          Use Cursor as source of truth
  npx sync-project-mcps -s cursor --dry-run Preview changes
`);
}

function run() {
  if (args.help) {
    printHelp();
    process.exit(0);
  }

  if (args.version) {
    console.log("1.0.0");
    process.exit(0);
  }

  const projectRoot = process.cwd();
  const dryRun = args["dry-run"];
  const verbose = args.verbose;
  const sourceArg = args.source?.toLowerCase();
  const sourceName = sourceArg ? CLIENT_ALIASES[sourceArg] : null;

  if (sourceArg && !sourceName) {
    console.error(c("red", `Unknown source: ${sourceArg}`));
    console.error(`Valid sources: ${Object.keys(CLIENT_ALIASES).join(", ")}`);
    process.exit(1);
  }

  console.log(c("bold", "\nSync MCP Configurations\n"));

  if (sourceName) {
    console.log(c("cyan", `Source: ${sourceName}\n`));
  }

  if (dryRun) {
    console.log(c("yellow", "DRY RUN - no files will be modified\n"));
  }

  const clients: ClientConfig[] = [
    getCursorConfig(projectRoot),
    getClaudeCodeConfig(projectRoot),
    getWindsurfConfig(projectRoot),
    getClineConfig(projectRoot),
    getRooCodeConfig(projectRoot),
    getGeminiConfig(projectRoot),
    getCodexConfig(projectRoot),
    getOpenCodeConfig(projectRoot),
  ];

  const existingClients = clients.filter((c) => c.exists && c.config);
  const missingClients = clients.filter((c) => !c.exists);

  if (existingClients.length === 0) {
    console.log(c("red", "No MCP configurations found.\n"));
    console.log("Expected locations:");
    for (const client of clients) {
      console.log(c("dim", `  ${client.name}: ${client.path}`));
    }
    console.log(
      `\nCreate at least one MCP config file to get started.`
    );
    process.exit(1);
  }

  console.log(c("cyan", "Found configurations:"));
  for (const client of existingClients) {
    const serverCount = Object.keys(client.config!.mcpServers).length;
    console.log(`  ${c("green", "+")} ${client.name}: ${serverCount} server(s)`);
    if (verbose) {
      for (const name of Object.keys(client.config!.mcpServers)) {
        console.log(c("dim", `      - ${name}`));
      }
    }
  }

  if (missingClients.length > 0 && verbose) {
    console.log(c("dim", "\nNot found (skipped):"));
    for (const client of missingClients) {
      console.log(c("dim", `  - ${client.name}`));
    }
  }

  let merged;
  if (sourceName) {
    const sourceClient = existingClients.find((cl) => cl.name === sourceName);
    if (!sourceClient) {
      console.error(c("red", `\nSource "${sourceName}" not found in project.`));
      console.error("Available configs:");
      for (const client of existingClients) {
        console.error(c("dim", `  - ${client.name}`));
      }
      process.exit(1);
    }
    merged = { mcpServers: { ...sourceClient.config!.mcpServers } };
  } else {
    merged = mergeConfigs(existingClients);
  }

  const mergedCount = Object.keys(merged.mcpServers).length;

  console.log(`\n${c("cyan", "Merged result:")} ${mergedCount} unique server(s)`);
  for (const name of Object.keys(merged.mcpServers).sort()) {
    console.log(`  ${c("blue", "-")} ${name}`);
  }

  console.log(`\n${c("cyan", "Syncing to clients...")}`);

  for (const client of existingClients) {
    const changes = getChanges(client, merged);
    const parts: string[] = [];

    if (changes.added.length > 0) {
      parts.push(c("green", `+${changes.added.length}`));
    }
    if (changes.removed.length > 0) {
      parts.push(c("red", `-${changes.removed.length}`));
    }

    const hasChanges = parts.length > 0;
    const changeInfo = hasChanges ? ` (${parts.join(", ")})` : "";
    const status = hasChanges ? c("green", "sync") : c("dim", "skip");

    console.log(`  [${status}] ${client.name}${changeInfo}`);

    if (verbose) {
      for (const name of changes.added) {
        console.log(c("green", `      + ${name}`));
      }
      for (const name of changes.removed) {
        console.log(c("red", `      - ${name}`));
      }
    }

    if (!dryRun && hasChanges) {
      const existingContent = readFileSync(client.path, "utf-8");
      let output: string;

      if (client.name === "Gemini CLI") {
        const existing = JSON.parse(existingContent);
        output = JSON.stringify({ ...existing, mcpServers: merged.mcpServers }, null, 2) + "\n";
      } else if (client.name === "Codex") {
        output = serializeCodexConfig(merged, existingContent);
      } else if (client.name === "OpenCode") {
        output = serializeOpenCodeConfig(merged, existingContent);
      } else {
        output = JSON.stringify(merged, null, 2) + "\n";
      }

      writeFileSync(client.path, output);
    }
  }

  console.log(`\n${c("green", "Done!")} ${dryRun ? "(dry run)" : ""}\n`);
}

run();

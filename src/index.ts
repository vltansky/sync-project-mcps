#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";
import { getCursorConfig } from "./clients/cursor.js";
import { getClaudeCodeConfig } from "./clients/claude-code.js";
import { getWindsurfConfig } from "./clients/windsurf.js";
import { getClineConfig } from "./clients/cline.js";
import { getRooCodeConfig } from "./clients/roo-code.js";
import { mergeConfigs, getChanges } from "./merge.js";
import type { ClientConfig } from "./types.js";

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

const { values: args } = parseArgs({
  options: {
    "dry-run": { type: "boolean", default: false },
    verbose: { type: "boolean", short: "v", default: false },
    help: { type: "boolean", short: "h", default: false },
    version: { type: "boolean", default: false },
  },
});

function printHelp() {
  console.log(`
${c("bold", "sync-project-mcps")} - Sync project-level MCP configurations across AI coding assistants

${c("bold", "USAGE")}
  npx sync-project-mcps [options]

${c("bold", "OPTIONS")}
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

${c("bold", "EXAMPLES")}
  npx sync-project-mcps              Sync all MCP configurations
  npx sync-project-mcps --dry-run    Preview changes without writing
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

  console.log(c("bold", "\nSync MCP Configurations\n"));

  if (dryRun) {
    console.log(c("yellow", "DRY RUN - no files will be modified\n"));
  }

  const clients: ClientConfig[] = [
    getCursorConfig(projectRoot),
    getClaudeCodeConfig(projectRoot),
    getWindsurfConfig(projectRoot),
    getClineConfig(projectRoot),
    getRooCodeConfig(projectRoot),
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
    console.log(c("dim", "\nNot found (will be created):"));
    for (const client of missingClients) {
      console.log(c("dim", `  - ${client.name}`));
    }
  }

  const merged = mergeConfigs(existingClients);
  const mergedCount = Object.keys(merged.mcpServers).length;

  console.log(`\n${c("cyan", "Merged result:")} ${mergedCount} unique server(s)`);
  for (const name of Object.keys(merged.mcpServers).sort()) {
    console.log(`  ${c("blue", "-")} ${name}`);
  }

  console.log(`\n${c("cyan", "Syncing to clients...")}`);

  for (const client of clients) {
    const changes = getChanges(client, merged);
    const parts: string[] = [];

    if (changes.added.length > 0) {
      parts.push(c("green", `+${changes.added.length}`));
    }
    if (changes.removed.length > 0) {
      parts.push(c("red", `-${changes.removed.length}`));
    }

    const changeInfo = parts.length > 0 ? ` (${parts.join(", ")})` : c("dim", " (no changes)");
    const status = client.exists ? c("green", "update") : c("yellow", "create");

    console.log(`  [${status}] ${client.name}${changeInfo}`);

    if (verbose && changes.added.length > 0) {
      for (const name of changes.added) {
        console.log(c("green", `      + ${name}`));
      }
    }

    if (!dryRun) {
      const dir = dirname(client.path);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(client.path, JSON.stringify(merged, null, 2) + "\n");
    }
  }

  console.log(`\n${c("green", "Done!")} ${dryRun ? "(dry run)" : ""}\n`);
}

run();

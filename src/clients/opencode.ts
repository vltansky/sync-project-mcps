import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseJsonc } from "../parsers/jsonc.js";
import type { ClientConfig, McpConfig, McpServer } from "../types.js";

const CONFIG_PATH = ".opencode/opencode.jsonc";

type OpenCodeMcpLocal = {
  type: "local";
  command: string[];
  environment?: Record<string, string>;
  enabled?: boolean;
};

type OpenCodeMcpRemote = {
  type: "remote";
  url: string;
  headers?: Record<string, string>;
  enabled?: boolean;
};

type OpenCodeMcp = OpenCodeMcpLocal | OpenCodeMcpRemote;

type OpenCodeConfig = {
  mcp?: Record<string, OpenCodeMcp>;
  [key: string]: unknown;
};

export function getOpenCodeConfig(projectRoot: string): ClientConfig {
  const configPath = join(projectRoot, CONFIG_PATH);
  const exists = existsSync(configPath);

  if (!exists) {
    return {
      name: "OpenCode",
      path: configPath,
      config: null,
      exists: false,
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = parseJsonc<OpenCodeConfig>(content);

    const mcpServers: Record<string, McpServer> = {};

    if (parsed.mcp) {
      for (const [name, server] of Object.entries(parsed.mcp)) {
        if (server.type !== "local") continue;
        if (server.enabled === false) continue;

        const [command, ...args] = server.command;
        mcpServers[name] = {
          command,
          ...(args.length > 0 && { args }),
          ...(server.environment && { env: server.environment }),
        };
      }
    }

    return {
      name: "OpenCode",
      path: configPath,
      config: { mcpServers },
      exists: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Warning: Failed to parse ${configPath}: ${msg}`);
    return {
      name: "OpenCode",
      path: configPath,
      config: null,
      exists: true,
    };
  }
}

export function serializeOpenCodeConfig(
  config: McpConfig,
  existingContent: string
): string {
  const existing = parseJsonc<OpenCodeConfig>(existingContent);

  const remoteMcp: Record<string, OpenCodeMcp> = {};
  if (existing.mcp) {
    for (const [name, server] of Object.entries(existing.mcp)) {
      if (server.type === "remote") {
        remoteMcp[name] = server;
      }
    }
  }

  const newMcp: Record<string, OpenCodeMcp> = { ...remoteMcp };

  for (const [name, server] of Object.entries(config.mcpServers)) {
    const command = [server.command, ...(server.args ?? [])];
    newMcp[name] = {
      type: "local",
      command,
      ...(server.env && { environment: server.env }),
    };
  }

  return JSON.stringify({ ...existing, mcp: newMcp }, null, 2) + "\n";
}

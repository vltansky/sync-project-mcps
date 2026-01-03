import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseToml, stringifyToml } from "../parsers/toml.js";
import type { ClientConfig, McpConfig, McpServer } from "../types.js";

const CONFIG_PATH = ".codex/config.toml";
const MCP_PREFIX = "mcp_servers.";

export function getCodexConfig(projectRoot: string): ClientConfig {
  const configPath = join(projectRoot, CONFIG_PATH);
  const exists = existsSync(configPath);

  if (!exists) {
    return {
      name: "Codex",
      path: configPath,
      config: null,
      exists: false,
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = parseToml(content);

    const mcpServers: Record<string, McpServer> = {};

    for (const [section, values] of Object.entries(parsed)) {
      if (!section.startsWith(MCP_PREFIX)) continue;

      const serverName = section.slice(MCP_PREFIX.length);
      const command = values.command as string;
      const args = values.args as string[] | undefined;
      const env = values.env as Record<string, string> | undefined;

      if (command) {
        mcpServers[serverName] = { command, args, env };
      }
    }

    return {
      name: "Codex",
      path: configPath,
      config: { mcpServers },
      exists: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Warning: Failed to parse ${configPath}: ${msg}`);
    return {
      name: "Codex",
      path: configPath,
      config: null,
      exists: true,
    };
  }
}

export function serializeCodexConfig(
  config: McpConfig,
  existingContent: string
): string {
  const existing = parseToml(existingContent);

  for (const key of Object.keys(existing)) {
    if (key.startsWith(MCP_PREFIX)) {
      delete existing[key];
    }
  }

  for (const [name, server] of Object.entries(config.mcpServers)) {
    const section = `${MCP_PREFIX}${name}`;
    existing[section] = {
      command: server.command,
      ...(server.args && { args: server.args }),
      ...(server.env && { env: server.env }),
    };
  }

  return stringifyToml(existing);
}

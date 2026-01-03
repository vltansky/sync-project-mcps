import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ClientConfig, McpConfig } from "../types.js";

function getGlobalConfigPath(): string {
  return join(homedir(), ".codeium/windsurf/mcp_config.json");
}

export function getWindsurfConfig(projectRoot: string): ClientConfig {
  const projectPath = join(projectRoot, ".windsurf/mcp.json");
  const globalPath = getGlobalConfigPath();

  // Prefer project-level config, fall back to global
  const configPath = existsSync(projectPath) ? projectPath : globalPath;
  const exists = existsSync(configPath);

  if (!exists) {
    return {
      name: "Windsurf",
      path: projectPath, // Default to project path for creation
      config: null,
      exists: false,
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as McpConfig;
    return {
      name: "Windsurf",
      path: configPath,
      config,
      exists: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Warning: Failed to parse ${configPath}: ${msg}`);
    return {
      name: "Windsurf",
      path: configPath,
      config: null,
      exists: true,
    };
  }
}

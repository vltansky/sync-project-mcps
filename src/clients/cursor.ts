import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ClientConfig, McpConfig } from "../types.js";

const CONFIG_PATH = ".cursor/mcp.json";

export function getCursorConfig(projectRoot: string): ClientConfig {
  const configPath = join(projectRoot, CONFIG_PATH);
  const exists = existsSync(configPath);

  if (!exists) {
    return {
      name: "Cursor",
      path: configPath,
      config: null,
      exists: false,
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as McpConfig;
    return {
      name: "Cursor",
      path: configPath,
      config,
      exists: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Warning: Failed to parse ${configPath}: ${msg}`);
    return {
      name: "Cursor",
      path: configPath,
      config: null,
      exists: true,
    };
  }
}

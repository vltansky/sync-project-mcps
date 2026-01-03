import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ClientConfig, McpConfig } from "../types.js";

const CONFIG_PATH = ".gemini/settings.json";

export function getGeminiConfig(projectRoot: string): ClientConfig {
  const configPath = join(projectRoot, CONFIG_PATH);
  const exists = existsSync(configPath);

  if (!exists) {
    return {
      name: "Gemini CLI",
      path: configPath,
      config: null,
      exists: false,
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(content) as { mcpServers?: Record<string, unknown> };
    const config: McpConfig = {
      mcpServers: (parsed.mcpServers ?? {}) as McpConfig["mcpServers"],
    };
    return {
      name: "Gemini CLI",
      path: configPath,
      config,
      exists: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Warning: Failed to parse ${configPath}: ${msg}`);
    return {
      name: "Gemini CLI",
      path: configPath,
      config: null,
      exists: true,
    };
  }
}

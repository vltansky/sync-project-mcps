import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { ClientConfig, McpConfig } from "../types.js";

const CONFIG_PATH = ".roo/mcp.json";

export function getRooCodeConfig(projectRoot: string): ClientConfig {
  const configPath = join(projectRoot, CONFIG_PATH);
  const exists = existsSync(configPath);

  if (!exists) {
    return {
      name: "Roo Code",
      path: configPath,
      config: null,
      exists: false,
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as McpConfig;
    return {
      name: "Roo Code",
      path: configPath,
      config,
      exists: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Warning: Failed to parse ${configPath}: ${msg}`);
    return {
      name: "Roo Code",
      path: configPath,
      config: null,
      exists: true,
    };
  }
}

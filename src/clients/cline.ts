import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ClientConfig, McpConfig } from "../types.js";

function getGlobalConfigPath(): string {
  const platform = process.platform;
  if (platform === "darwin") {
    return join(
      homedir(),
      "Library/Application Support/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"
    );
  } else if (platform === "win32") {
    return join(
      process.env.APPDATA || "",
      "Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"
    );
  }
  return join(
    homedir(),
    ".config/Code/User/globalStorage/saoudrizwan.claude-dev/settings/cline_mcp_settings.json"
  );
}

export function getClineConfig(projectRoot: string): ClientConfig {
  const projectPath = join(projectRoot, ".cline/mcp.json");
  const globalPath = getGlobalConfigPath();

  // Prefer project-level config, fall back to global
  const configPath = existsSync(projectPath) ? projectPath : globalPath;
  const exists = existsSync(configPath);

  if (!exists) {
    return {
      name: "Cline",
      path: projectPath,
      config: null,
      exists: false,
    };
  }

  try {
    const content = readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as McpConfig;
    return {
      name: "Cline",
      path: configPath,
      config,
      exists: true,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`Warning: Failed to parse ${configPath}: ${msg}`);
    return {
      name: "Cline",
      path: configPath,
      config: null,
      exists: true,
    };
  }
}
